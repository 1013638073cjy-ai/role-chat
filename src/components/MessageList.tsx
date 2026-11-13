
import { useLayoutEffect, useEffect, useRef } from 'react'
import { Card, Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

import 'highlight.js/styles/github.css'

import { useChatStore } from '../store/chatStore'

const { Title, Text } = Typography

export default function MessageList({
  loading
}: {
  loading: boolean
}) {
  const sessions = useChatStore(s => s.sessions)
  const activeId = useChatStore(s => s.activeId)

  const messages =
    sessions.find(s => s.id === activeId)?.messages ?? []

  // ① 外层滚动容器
  const scrollRef = useRef<HTMLDivElement>(null)

  // ② 内层内容容器：监听它的高度变化
  const contentRef = useRef<HTMLDivElement>(null)

  // ③ 是否允许自动跟随
  const shouldFollowRef = useRef(true)

  // ④ 记录上一次会话
  const lastSessionRef = useRef(activeId)

  // 判断是否接近底部
  const isNearBottom = () => {
    const el = scrollRef.current
    if (!el) return true

    const distance =
      el.scrollHeight - el.scrollTop - el.clientHeight

    return distance <= 80
  }

  // 滚动到底部
  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return

    el.scrollTop = el.scrollHeight
  }

  // ⑤ 用户滚动时，判断是否暂停自动跟随
  const handleScroll = () => {
    shouldFollowRef.current = isNearBottom()
  }

  // ⑥ 切换会话时，定位到该会话底部
  useLayoutEffect(() => {
    if (lastSessionRef.current !== activeId) {
      lastSessionRef.current = activeId

      shouldFollowRef.current = true
      scrollToBottom()
    }
  }, [activeId])

  // ⑦ 消息更新后，如果允许跟随就滚到底部
  useLayoutEffect(() => {
    if (shouldFollowRef.current) {
      scrollToBottom()
    }
  }, [messages])

  // ⑧ ResizeObserver：观察内容尺寸变化
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const observer = new ResizeObserver(() => {
      // Markdown 代码块、表格等引起高度变化时
      if (shouldFollowRef.current) {
        scrollToBottom()
      }
    })

    observer.observe(content)

    // 组件卸载时释放观察器
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={scrollRef}
      className="chat-scroll"
      onScroll={handleScroll}
    >
      <Card className="chat-area">
        <div ref={contentRef} className="chat-content">
          {messages.length === 0 ? (
            <div className="welcome">
              <RobotOutlined
                style={{ fontSize: 40 }}
              />

              <Title level={4}>
                你好，我是 RoleChat
              </Title>

              <Text type="secondary">
                请选择角色和场景，开始对话
              </Text>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.role}`}
                >
                  <div className="message-bubble">
                    {msg.role === 'assistant' ? (
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          skipHtml
                        >
                          {msg.content ||
                            (loading &&
                              index === messages.length - 1
                              ? '正在生成...'
                              : '')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
