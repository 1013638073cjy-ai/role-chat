
import express from 'express'
import 'dotenv/config'
import { rateLimit } from 'express-rate-limit'
import { createRoleAgent } from './agent.js'
import { MODEL_CONFIG } from './models/modelFactory.js'
import { calculateUsage } from './models/usage.js'

const app = express()

app.use(express.json({ limit: '1mb' }))

if (process.env.NODE_ENV === 'production') {
  // Render 代理环境，使用真实客户端 IP 限流
  app.set('trust proxy', 1)

  app.use('/api/chat', rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: '演示请求过于频繁，请稍后重试'
    }
  }))
}

app.post('/api/chat', async (req, res) => {
  const {
    messages,
    role = 'secretary',
    scene = 'shopping',
    modelName = 'qwen'
  } = req.body ?? {}

  // 1. 参数验证
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 100 ||
    messages.some(msg =>
      !msg ||
      !['user', 'assistant'].includes(msg.role) ||
      typeof msg.content !== 'string' ||
      msg.content.length > 20000
    )
  ) {
    return res.status(400).json({
      error: '消息格式不正确'
    })
  }

  if (
    !['secretary', 'friend'].includes(role) ||
    !['shopping', 'investment', 'travel'].includes(scene) ||
    !Object.hasOwn(MODEL_CONFIG, modelName)
  ) {
    return res.status(400).json({
      error: '角色、场景或模型不正确'
    })
  }

  // 2. 创建 Agent
  let agent

  try {
    agent = createRoleAgent(modelName, role, scene)
  } catch (error) {
    return res.status(400).json({
      error: error.message
    })
  }

  // 最多保留最近 12 条历史上下文
  const chatMessages = messages
    .filter(msg => msg.content.trim())
    .slice(-12)

  const controller = new AbortController()

  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort()
    }
  })

  // 向前端发送 SSE
  const sendEvent = (data) => {
    if (!res.destroyed && !res.writableEnded) {
      res.write(
        `data: ${JSON.stringify(data)}\n\n`
      )
    }
  }

  try {
    console.log('[Agent] 请求模型：', modelName)

    // 3. 创建流式 Agent
    const stream = await agent.stream(
      { messages: chatMessages },
      {
        streamMode: ['messages', 'updates'],
        signal: controller.signal,
        recursionLimit: 12
      }
    )

    // 4. 设置 SSE 响应头
    res.setHeader(
      'Content-Type',
      'text/event-stream; charset=utf-8'
    )
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let inputTokens = 0
    let outputTokens = 0
    let usageCount = 0
    let toolCount = 0

    // 5. 同时处理模型文本和 Agent 状态
    for await (const [mode, data] of stream) {
      if (controller.signal.aborted) break

      // 模式一：模型的流式文本
      if (mode === 'messages') {
        const [chunk, metadata] = data
        console.log('流式节点：', metadata?.langgraph_node)
        console.log('文本数据：', chunk.content)
        // 只处理模型节点，不处理工具消息
        if (chunk._getType?.() !== 'ai') {
          continue
        }

        // 排除 Function Calling 参数及推理内容
        let content = ''

        if (typeof chunk.content === 'string') {
          content = chunk.content
        } else if (Array.isArray(chunk.content)) {
          content = chunk.content
            .filter(block =>
              block.type === 'text' &&
              typeof block.text === 'string'
            )
            .map(block => block.text)
            .join('')
        }

        if (content) {
          sendEvent({
            choices: [{
              delta: { content }
            }]
          })
        }
      }

      // 模式二：Agent 执行步骤
      if (mode === 'updates') {
        for (const update of Object.values(data)) {
          const stepMessages = update?.messages ?? []

          for (const msg of stepMessages) {
            // AI 决定调用工具
            if (msg.tool_calls?.length) {
              for (const call of msg.tool_calls) {
                console.log(
                  '[Agent] 选择工具：',
                  call.name,
                  call.args
                )

                sendEvent({
                  type: 'tool',
                  status: 'called',
                  name: call.name
                })
              }
            }

            // 工具执行结果
            if (msg._getType?.() === 'tool') {
              toolCount++

              const result =
                typeof msg.content === 'string'
                  ? msg.content
                  : JSON.stringify(msg.content)

              console.log(
                '[Agent] 工具完成：',
                msg.name,
                result.slice(0, 300)
              )

              sendEvent({
                type: 'tool',
                status: 'completed',
                name: msg.name
              })
            }

            // 统计每轮模型调用的 Token
            // 使用完成后的 AIMessage，而非每个增量块
            if (
              msg._getType?.() === 'ai' &&
              msg.usage_metadata
            ) {
              inputTokens +=
                msg.usage_metadata.input_tokens ?? 0

              outputTokens +=
                msg.usage_metadata.output_tokens ?? 0

              usageCount++
            }
          }
        }
      }
    }

    if (controller.signal.aborted) return

    console.log('[Agent] 工具执行次数：', toolCount)

    // 6. 返回 Token 用量
    if (usageCount > 0) {
      const usage = calculateUsage(
        modelName,
        {
          input_tokens: inputTokens,
          output_tokens: outputTokens
        }
      )

      if (usage) {
        sendEvent({
          type: 'usage',
          usage
        })

        console.log('[Agent] Token 用量：', usage)
      }
    } else {
      console.log('[Agent] 未收到有效 Token 用量')
    }

    // 7. 发送结束标记
    if (!res.destroyed) {
      res.write('data: [DONE]\n\n')
      res.end()
    }

  } catch (error) {
    if (controller.signal.aborted) return

    console.error('[Agent] 执行异常：', error)

    if (res.headersSent) {
      sendEvent({
        error: 'Agent 执行失败，请查看后端终端'
      })
      res.end()
    } else {
      res.status(502).json({
        error: 'Agent 请求失败，请检查模型和工具配置'
      })
    }
  }
})


// 生产环境提供 Vite 构建后的页面
if (process.env.NODE_ENV === 'production') {
  const path = await import('node:path')

  const distPath = path.resolve(process.cwd(), 'dist')

  app.use(express.static(distPath))

  // React 单页面应用回退到 index.html
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api/')
    ) {
      return res.sendFile(
        path.join(distPath, 'index.html')
      )
    }

    next()
  })
}

// Render 会提供 PORT 环境变量
const PORT = process.env.PORT || 3001

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RoleChat 服务启动：${PORT}`)
})

