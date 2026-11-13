
import { Typography } from 'antd'
import AgentSteps from './components/AgentSteps'
import ChatSidebar from './components/ChatSidebar'
import RoleSelector from './components/RoleSelector'
import MessageList from './components/MessageList'
import ChatBox from './components/ChatBox'
import { useChatStream } from './hooks/useChatStream'

const { Title, Text } = Typography

function App() {
  const {
    loading,
    error,
    agentSteps,
    sendMessage,
    stopMessage,
    retryMessage,
    cancelMessage
  } = useChatStream()

  return (
    <div className="app">
      <header className="header">
        <Title level={3}>RoleChat</Title>

        <Text type="secondary">
          多角色 AI 智能对话平台
        </Text>
      </header>

      <div className="app-layout">
        <ChatSidebar onBeforeSwitch={cancelMessage} />

        <main className="chat-container">
          <RoleSelector disabled={loading} />

          <MessageList loading={loading} />
          <AgentSteps steps={agentSteps} />
          <ChatBox
            loading={loading}
            error={error}
            onSend={sendMessage}
            onStop={stopMessage}
            onRetry={retryMessage}
          />
        </main>
      </div>
    </div>
  )
}

export default App
