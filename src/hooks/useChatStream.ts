
import { useRef, useState } from 'react'

import {
  useChatStore,
  type ChatMessage,
  type UsageInfo
} from '../store/chatStore'
export type AgentStep = {
  name: string
  status: 'called' | 'completed'
}
export function useChatStream() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const controllerRef = useRef<AbortController | null>(null)
  const runningRef = useRef(false)

  // 保存上次请求，支持失败重试
  const lastRequestRef = useRef<{
    sessionId: string
    history: ChatMessage[]
  } | null>(null)

  const requestChat = async (
    sessionId: string,
    history: ChatMessage[]
  ) => {
    if (runningRef.current) return

    const store = useChatStore.getState()
    const session = store.sessions.find(s => s.id === sessionId)

    if (!session) return

    const { role, scene } = session
    const modelName = session.modelName ?? 'qwen'

    runningRef.current = true
    setLoading(true)
    setError('')
    setAgentSteps([])

    lastRequestRef.current = {
      sessionId,
      history
    }

    const controller = new AbortController()
    controllerRef.current = controller

    let fullText = ''
    let frameId = 0
    let finished = false
    let usageInfo: UsageInfo | null = null

    // 更新当前会话的 AI 回复
    const saveReply = () => {
      frameId = 0

      useChatStore.getState().setSessionMessages(
        sessionId,
        [
          ...history,
          {
            role: 'assistant',
            content: fullText
          }
        ]
      )
    }

    // 每帧最多安排一次状态更新
    const scheduleUpdate = () => {
      if (frameId) return

      frameId = requestAnimationFrame(saveReply)
    }

    // 新请求开始时清空旧用量
    store.setSessionUsage(sessionId, null)
    saveReply()

    try {

      // 公开演示环境要求输入访问码
      let demoCode = ''

      if (import.meta.env.PROD) {
        demoCode =
          sessionStorage.getItem('rolechat-demo-code') || ''

        if (!demoCode) {
          demoCode =
            window.prompt('请输入 RoleChat 演示访问码') || ''

          if (!demoCode) {
            throw new Error('未输入演示访问码')
          }

          sessionStorage.setItem('rolechat-demo-code', demoCode)
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Demo-Code': demoCode
        },

        body: JSON.stringify({
          messages: history,
          role,
          scene,
          modelName
        }),

        signal: controller.signal
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (response.status === 403) {
          sessionStorage.removeItem('rolechat-demo-code')
        }
        throw new Error(
          data.error || 'AI 请求失败'
        )
      }

      if (!response.body) {
        throw new Error('浏览器不支持流式响应')
      }

      // 读取 SSE
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''

      // 解析单条 SSE 事件
      const handleEvent = (event: string) => {
        const data = event
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart())
          .join('\n')

        if (!data) return

        if (data.trim() === '[DONE]') {
          finished = true
          return
        }

        const json = JSON.parse(data)

        // 后端错误
        if (json.error) {
          throw new Error(json.error)
        }

        // Token 用量事件
        if (json.type === 'usage') {
          usageInfo = json.usage
          return
        }

        // Agent 工具执行事件
        if (json.type === 'tool') {
          if (json.status === 'called') {
            setAgentSteps(prev => [
              ...prev,
              {
                name: json.name,
                status: 'called'
              }
            ])
          }

          if (json.status === 'completed') {
            setAgentSteps(prev => {
              const next = [...prev]

              // 找到最近一个尚未完成的同名工具
              const index = next.findLastIndex(
                item =>
                  item.name === json.name &&
                  item.status === 'called'
              )

              if (index !== -1) {
                next[index] = {
                  ...next[index],
                  status: 'completed'
                }
              }

              return next
            })
          }

          return
        }

        // 普通文本
        const content = json.choices?.[0]?.delta?.content

        if (
          typeof content === 'string' &&
          content
        ) {
          fullText += content
          scheduleUpdate()
        }
      }

      // 不断读取新的网络数据块
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, {
          stream: true
        })

        buffer = buffer.replace(/\r\n/g, '\n')

        let index: number

        // 一个数据块可能包含多条 SSE
        while (
          (index = buffer.indexOf('\n\n')) !== -1
        ) {
          const event = buffer.slice(0, index)

          buffer = buffer.slice(index + 2)

          handleEvent(event)
        }

        if (finished) {
          await reader.cancel()
          break
        }
      }

      if (!finished) {
        buffer += decoder.decode()

        if (buffer.trim()) {
          handleEvent(buffer)
        }
      }

      if (!finished) {
        throw new Error(
          '流式连接意外结束，请重试'
        )
      }

      // 保存本次用量
      useChatStore.getState().setSessionUsage(
        sessionId,
        usageInfo
      )

    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : '请求失败'
        )
      }

    } finally {
      // 清理等待中的渲染任务
      if (frameId) {
        cancelAnimationFrame(frameId)
      }

      // 保留已生成的文本
      useChatStore.getState().setSessionMessages(
        sessionId,
        [
          ...history,
          ...(fullText
            ? [{
              role: 'assistant' as const,
              content: fullText
            }]
            : [])
        ]
      )

      runningRef.current = false
      controllerRef.current = null
      setLoading(false)
    }
  }

  // 发送消息
  const sendMessage = (input: string) => {
    if (!input.trim() || runningRef.current) return

    const {
      sessions,
      activeId
    } = useChatStore.getState()

    const session = sessions.find(s => s.id === activeId)

    if (!session) return

    const history: ChatMessage[] = [
      ...session.messages.filter(m => m.content.trim()),
      {
        role: 'user',
        content: input.trim()
      }
    ]

    void requestChat(activeId, history)
  }

  // 停止生成
  const stopMessage = () => {
    controllerRef.current?.abort()
  }

  // 重试上一次请求
  const retryMessage = () => {
    const last = lastRequestRef.current

    if (!last || runningRef.current) return

    if (
      useChatStore.getState().activeId !== last.sessionId
    ) {
      return
    }

    void requestChat(
      last.sessionId,
      last.history
    )
  }

  // 切换会话前取消当前生成
  const cancelMessage = () => {
    // 取消旧会话的请求
    controllerRef.current?.abort()

    // 清空错误提示和 Agent 执行记录
    setError('')
    setAgentSteps([])

    // 清空上一次请求
    lastRequestRef.current = null
  }

  return {
    loading,
    error,
    agentSteps,
    sendMessage,
    stopMessage,
    retryMessage,
    cancelMessage
  }
}
