
import { ChatOpenAI } from '@langchain/openai'

// 模型配置
export const MODEL_CONFIG = {
  qwen: 'qwen3.8-flash',
  kimi: 'kimi-k3',
  deepseek: 'deepseek-v4.1-flash'
}

// 简单工厂模式
export function createModel(modelName = 'qwen') {
  const modelId = MODEL_CONFIG[modelName]

  if (!modelId) {
    throw new Error('不支持的模型')
  }

  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error('未配置阿里云百炼 API Key')
  }


  return new ChatOpenAI({
    model: modelId,
    apiKey: process.env.DASHSCOPE_API_KEY,

    configuration: {
      baseURL:
        'https://dashscope.aliyuncs.com/compatible-mode/v1'
    },

    // 普通 Qwen 聊天关闭深度思考，减少首字等待
    ...(modelName === 'qwen'
      ? { modelKwargs: { reasoning_effort: 'none' } }
      : {}),

    streamUsage: true,
    maxRetries: 0
  })

}
