
import { useState, useEffect } from 'react'
import { Card, Tag, Space, Typography, Button } from 'antd'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  ToolOutlined,
  CloseOutlined
} from '@ant-design/icons'

import type { AgentStep } from '../hooks/useChatStream'

const { Text } = Typography

const toolNames: Record<string, string> = {
  web_search: '联网搜索',
  calculate_budget: '预算计算'
}

type Props = {
  steps: AgentStep[]
}

export default function AgentSteps({ steps }: Props) {
  const [visible, setVisible] = useState(true)

  // 新一轮工具执行时重新显示
  useEffect(() => {
    if (steps.some(step => step.status === 'called')) {
      setVisible(true)
    }
  }, [steps])

  if (steps.length === 0 || !visible) return null

  return (
    <Card
      size="small"
      title={
        <Space>
          <ToolOutlined />
          Agent 执行过程
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => setVisible(false)}
        />
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {steps.map((step, index) => (
          <Space key={index}>
            {step.status === 'completed'
              ? <CheckCircleOutlined
                style={{ color: '#52c41a' }}
              />
              : <LoadingOutlined spin />
            }

            <Text>
              {toolNames[step.name] || step.name}
            </Text>

            <Tag color={
              step.status === 'completed'
                ? 'success'
                : 'processing'
            }>
              {step.status === 'completed'
                ? '已完成'
                : '执行中'}
            </Tag>
          </Space>
        ))}
      </Space>
    </Card>
  )
}
