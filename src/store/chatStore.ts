
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'secretary' | 'friend'
export type Scene = 'shopping' | 'investment' | 'travel'
export type ModelName = 'qwen' | 'kimi' | 'deepseek'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type UsageInfo = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number | null
}

export type ChatSession = {
  id: string
  title: string
  role: Role
  scene: Scene
  modelName?: ModelName
  messages: ChatMessage[]
  usage?: UsageInfo | null
}

type ChatStore = {
  sessions: ChatSession[]
  activeId: string
  deleteSession: (id: string) => void
  createSession: () => void
  selectSession: (id: string) => void
  setRole: (role: Role) => void
  setScene: (scene: Scene) => void
  setModel: (model: ModelName) => void

  setSessionMessages: (
    id: string,
    messages: ChatMessage[]
  ) => void

  setSessionUsage: (
    id: string,
    usage: UsageInfo | null
  ) => void
}

const initialSession: ChatSession = {
  id: 'default',
  title: '新会话',
  role: 'secretary',
  scene: 'shopping',
  modelName: 'qwen',
  messages: [],
  usage: null
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      sessions: [initialSession],
      activeId: 'default',

      // 新建会话
      createSession: () => {
        const id = crypto.randomUUID()

        set(state => ({
          sessions: [
            {
              id,
              title: '新会话',
              role: 'secretary',
              scene: 'shopping',
              modelName: 'qwen',
              messages: [],
              usage: null
            },
            ...state.sessions
          ],
          activeId: id
        }))
      },

      // 切换会话
      selectSession: (id) => {
        set(state =>
          state.sessions.some(s => s.id === id)
            ? { activeId: id }
            : state
        )
      },

      deleteSession: (id) => {
        set(state => {
          const remaining = state.sessions.filter(
            session => session.id !== id
          )

          // 如果删光了，自动创建空会话
          if (remaining.length === 0) {
            const newId = crypto.randomUUID()

            return {
              sessions: [{
                id: newId,
                title: '新会话',
                role: 'secretary',
                scene: 'shopping',
                modelName: 'qwen',
                messages: [],
                usage: null
              }],
              activeId: newId
            }
          }

          return {
            sessions: remaining,
            activeId:
              state.activeId === id
                ? remaining[0].id
                : state.activeId
          }
        })
      },


      // 修改角色
      setRole: (role) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === state.activeId
              ? { ...s, role }
              : s
          )
        }))
      },

      // 修改场景
      setScene: (scene) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === state.activeId
              ? { ...s, scene }
              : s
          )
        }))
      },

      // 修改模型
      setModel: (modelName) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === state.activeId
              ? { ...s, modelName, usage: null }
              : s
          )
        }))
      },

      // 保存聊天消息
      setSessionMessages: (id, messages) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === id
              ? {
                ...s,
                messages,
                title:
                  s.title === '新会话'
                    ? messages.find(m => m.role === 'user')
                      ?.content.slice(0, 18) || '新会话'
                    : s.title
              }
              : s
          )
        }))
      },

      // 保存本次 Token 用量
      setSessionUsage: (id, usage) => {
        set(state => ({
          sessions: state.sessions.map(s =>
            s.id === id
              ? { ...s, usage }
              : s
          )
        }))
      }
    }),

    {
      name: 'rolechat-storage',

      partialize: state => ({
        sessions: state.sessions,
        activeId: state.activeId
      })
    }
  )
)
