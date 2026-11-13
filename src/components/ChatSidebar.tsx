
import { Button, Typography, Popconfirm } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'

import { useChatStore } from '../store/chatStore'

const { Text } = Typography

type Props = {
  onBeforeSwitch: () => void
}

export default function ChatSidebar({
  onBeforeSwitch
}: Props) {
  const sessions = useChatStore(s => s.sessions)
  const activeId = useChatStore(s => s.activeId)

  const createSession = useChatStore(s => s.createSession)
  const selectSession = useChatStore(s => s.selectSession)
  const deleteSession = useChatStore(s => s.deleteSession)

  const handleCreate = () => {
    onBeforeSwitch()
    createSession()
  }

  const handleSelect = (id: string) => {
    if (id === activeId) return

    onBeforeSwitch()
    selectSession(id)
  }

  const handleDelete = (id: string) => {
    // 删除当前会话前，取消正在进行的请求
    if (id === activeId) {
      onBeforeSwitch()
    }

    deleteSession(id)
  }

  return (
    <aside className="chat-sidebar">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        block
        onClick={handleCreate}
      >
        新建会话
      </Button>

      <Text type="secondary">历史会话</Text>

      <div className="session-list">
        {sessions.map(session => (
          <div
            key={session.id}
            className={
              'session-item ' +
              (session.id === activeId ? 'active' : '')
            }
            onClick={() => handleSelect(session.id)}
          >
            <span
              className="session-title"
              title={session.title}
            >
              {session.title}
            </span>

            <Popconfirm
              title="删除这条会话？"
              description="删除后无法恢复"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={(event) => {
                event?.stopPropagation()
                handleDelete(session.id)
              }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation()
                }}
              />
            </Popconfirm>
          </div>
        ))}
      </div>
    </aside>
  )
}
