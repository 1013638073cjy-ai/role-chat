
// 参考单价：人民币元 / 百万 Token
const MODEL_PRICES = {
  qwen: {
    input: 0.8,
    output: 2.7
  },
  kimi: {
    input: 20,
    output: 100
  },
  deepseek: {
    input: 2,
    output: 8
  }
}

export function calculateUsage(modelName, usage) {
  // 没有模型用量数据时，不伪造数字
  if (!usage) return null

  const inputTokens = usage.input_tokens
  const outputTokens = usage.output_tokens

  if (
    !Number.isFinite(inputTokens) ||
    !Number.isFinite(outputTokens)
  ) {
    return null
  }

  const price = MODEL_PRICES[modelName]

  const estimatedCost = price
    ? (
      inputTokens * price.input +
      outputTokens * price.output
    ) / 1_000_000
    : null

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost
  }
}
