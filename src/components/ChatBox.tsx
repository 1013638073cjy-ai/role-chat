
import { useEffect, useRef, useState } from 'react'
import { Button, Input, Alert, Space, message } from 'antd'
import {
  SendOutlined,
  StopOutlined,
  ReloadOutlined,
  AudioOutlined
} from '@ant-design/icons'

// Web Speech API 的最小类型
type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{
    transcript: string
  }>>
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean

  onresult:
  ((event: SpeechResultEvent) => void) | null
  onerror:
  ((event: { error: string }) => void) | null
  onend: (() => void) | null

  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

type Props = {
  loading: boolean
  error: string
  onSend: (text: string) => void
  onStop: () => void
  onRetry: () => void
}

export default function ChatBox({
  loading,
  error,
  onSend,
  onStop,
  onRetry
}: Props) {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null)

  // 判断浏览器是否支持语音识别
  const speechWindow = window as SpeechWindow

  const SpeechRecognitionClass =
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition

  const supported = Boolean(SpeechRecognitionClass)

  // 普通消息发送
  const handleSend = () => {
    if (!input.trim() || loading || listening) return

    onSend(input.trim())
    setInput('')
  }

  // 点击麦克风
  const handleVoice = () => {
    // 正在识别时，再次点击则停止识别
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    if (!SpeechRecognitionClass) {
      messageApi.warning('当前浏览器不支持语音识别')
      return
    }

    const recognition = new SpeechRecognitionClass()

    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    // 语音识别成功
    recognition.onresult = (event) => {
      const transcript =
        event.results[0]?.[0]?.transcript?.trim() || ''

      if (transcript) {
        setInput(prev =>
          [prev.trim(), transcript]
            .filter(Boolean)
            .join(' ')
        )
      }
    }

    // 语音识别失败
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' &&
        event.error !== 'aborted') {
        messageApi.error(
          `语音识别失败：${event.error}`
        )
      }
    }

    // 识别结束
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setListening(true)
    } catch {
      recognitionRef.current = null
      setListening(false)
      messageApi.error('无法启动语音识别')
    }
  }

  // 离开页面时清理识别实例
  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current

      if (recognition) {
        recognition.onend = null
        recognition.onresult = null
        recognition.onerror = null
        recognition.abort()
      }
    }
  }, [])

  return (
    <div className="chat-controls">
      {contextHolder}

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              disabled={loading}
              onClick={onRetry}
            >
              重试
            </Button>
          }
        />
      )}

      <div className="input-area">
        <Input
          size="large"
          placeholder={
            listening
              ? '正在聆听，请开始说话...'
              : '请输入你的问题...'
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          disabled={loading}
        />

        <Space>
          <Button
            size="large"
            danger={listening}
            type={listening ? 'primary' : 'default'}
            icon={<AudioOutlined />}
            onClick={handleVoice}
            disabled={!supported || loading}
            title={
              supported
                ? '点击开始或停止语音输入'
                : '当前浏览器不支持语音识别'
            }
          />

          {loading ? (
            <Button
              danger
              size="large"
              icon={<StopOutlined />}
              onClick={onStop}
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={listening}
            >
              发送
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
