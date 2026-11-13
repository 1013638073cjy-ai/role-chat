
import { tool } from 'langchain'
import { TavilySearch } from '@langchain/tavily'
import { z } from 'zod'

// Tavily 在线搜索实例
const tavily = new TavilySearch({
  maxResults: 5,
  searchDepth: 'basic',
  topic: 'general',
  includeAnswer: false,
  includeRawContent: false
})

// 工具一：联网搜索
export const webSearchTool = tool(
  async ({ query }) => {
    const start = Date.now()

    try {
      console.log('[Agent] 开始联网搜索：', query)

      const result = await tavily.invoke({ query })

      const text =
        typeof result === 'string'
          ? result
          : JSON.stringify(result)

      console.log(
        '[Agent] 搜索耗时：',
        Date.now() - start,
        'ms'
      )

      if (!text || text === '[]') {
        return '未找到有效搜索结果，请告知用户。'
      }

      // 限制返回长度，减少 Token 消耗
      return text.slice(0, 10000)

    } catch (error) {
      console.error('[Agent] 搜索失败：', error)

      return '联网搜索失败，无法确认最新信息。' +
        '请告知用户当前无法核实，不要编造结果。'
    }
  },
  {
    name: 'web_search',

    description:
      '联网搜索商品价格、商品配置、旅游景点、' +
      '门票信息、旅游攻略及其他需要最新资料的问题。' +
      '当用户需要外部或近期信息时使用。',

    schema: z.object({
      query: z.string()
        .min(2)
        .max(200)
        .describe('用于互联网搜索的关键词')
    })
  }
)

// 工具二：预算计算
export const budgetTool = tool(
  async ({ budget, expenses }) => {
    const total = expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    )

    const remaining = budget - total

    const result = {
      budget,
      expenses,
      totalExpenses: Number(total.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      isOverBudget: remaining < 0
    }

    console.log('[Agent] 预算计算结果：', result)

    return JSON.stringify(result)
  },
  {
    name: 'calculate_budget',

    description:
      '根据用户提供的总预算以及商品、住宿、' +
      '交通、门票等支出金额，计算总费用和剩余预算。' +
      '只有获得明确金额后才使用。',

    schema: z.object({
      budget: z.number()
        .nonnegative()
        .max(1e10)
        .describe('总预算，单位元'),

      expenses: z.array(
        z.object({
          name: z.string().min(1).max(60),
          amount: z.number()
            .nonnegative()
            .max(1e10)
        })
      )
        .min(1)
        .max(20)
        .describe('各项支出的名称及金额')
    })
  }
)

// 导出给 Agent
export const agentTools = [
  webSearchTool,
  budgetTool
]
