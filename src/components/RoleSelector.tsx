
import { Select, Space, Typography } from 'antd'

import {
  useChatStore,
  type Role,
  type Scene,
  type ModelName
} from '../store/chatStore'

const { Text } = Typography

export default function RoleSelector({
  disabled = false
}: {
  disabled?: boolean
}) {
  const sessions = useChatStore(s => s.sessions)
  const activeId = useChatStore(s => s.activeId)

  const setRole = useChatStore(s => s.setRole)
  const setScene = useChatStore(s => s.setScene)
  const setModel = useChatStore(s => s.setModel)

  const session = sessions.find(s => s.id === activeId)

  if (!session) return null

  const usage = session.usage

  return (
    <div>
      <Space wrap className="role-selector">
        <Text>AI 角色：</Text>

        <Select<Role>
          value={session.role}
          disabled={disabled}
          style={{ width: 140 }}
          onChange={setRole}
          options={[
            { label: '秘书型助手', value: 'secretary' },
            { label: '朋友型助手', value: 'friend' }
          ]}
        />

        <Text>业务场景：</Text>

        <Select<Scene>
          value={session.scene}
          disabled={disabled}
          style={{ width: 110 }}
          onChange={setScene}
          options={[
            { label: '购物', value: 'shopping' },
            { label: '投资', value: 'investment' },
            { label: '旅游', value: 'travel' }
          ]}
        />

        <Text>AI 模型：</Text>

        <Select<ModelName>
          value={session.modelName ?? 'qwen'}
          disabled={disabled}
          style={{ width: 205 }}
          onChange={setModel}
          options={[
            {
              label: 'Qwen3.8-Flash',
              value: 'qwen'
            },
            {
              label: 'Kimi-K3',
              value: 'kimi'
            },
            {
              label: 'DeepSeek V4.1 Flash',
              value: 'deepseek'
            }
          ]}
        />
      </Space>

      {/* 本次请求 Token 统计 */}
      {usage && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16
          }}
        >
          <Text type="secondary">
            输入：{usage.inputTokens} Token
          </Text>

          <Text type="secondary">
            输出：{usage.outputTokens} Token
          </Text>

          <Text type="secondary">
            总计：{usage.totalTokens} Token
          </Text>

          <Text type="secondary">
            参考费用：
            {usage.estimatedCost !== null
              ? `¥${usage.estimatedCost.toFixed(6)}`
              : '暂无'}
          </Text>
        </div>
      )}
    </div>
  )
}
