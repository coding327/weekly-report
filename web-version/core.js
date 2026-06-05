/**
 * AI 周报生成器 - 核心逻辑（纯函数，可测试）
 * 浏览器和 Node.js 通用
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeeklyReport = factory();
  }
}(this, function () {

  // ========== 周报风格配置 ==========
  const STYLE_CONFIG = {
    professional: {
      label: '专业正式',
      systemPrompt: '你是一个专业的周报撰写助手，擅长大厂风格的正式汇报。只输出周报正文，不输出解释。',
      template: `请生成一份专业正式的周报，适合大厂/国企风格。要求：
- 结构化：分为「本周完成」「下周计划」「风险与问题」「需要支持」四个板块
- 语言正式但不空洞，每一条都要有具体内容
- 适当使用数据和量化描述
- 体现思考深度和主动性`
    },
    casual: {
      label: '简洁干练',
      systemPrompt: '你是一个高效的周报撰写助手，擅长简洁有力的汇报。只输出周报正文，不输出解释。',
      template: `请生成一份简洁干练的周报，适合大多数公司。要求：
- 用简短的要点列出本周工作（3-6条）
- 每条一句话讲清楚：做了什么 + 结果/进展
- 语言简洁、不废话、不空泛
- 如果有关键数据可以适当量化`
    },
    detailed: {
      label: '详细汇报',
      systemPrompt: '你是一个细致周到的周报撰写助手，擅长向上管理型的详细汇报。只输出周报正文，不输出解释。',
      template: `请生成一份详细的工作汇报，适合向上管理和年终总结。要求：
- 每条工作展开写：背景 → 动作 → 结果 → 下一步
- 突出个人贡献和业务价值
- 量化产出，用数据说话
- 体现主动思考和复盘总结`
    },
    startup: {
      label: '互联网风格',
      systemPrompt: '你是一个创业公司风格的周报撰写助手。只输出周报正文，不输出解释。',
      template: `请生成一份互联网/创业公司风格的周报。要求：
- 风格轻松但信息量足
- 格式：🚀 Progress / 🤔 Blockers / 📅 Next Week
- 可以适当使用 emoji
- 突出速度和迭代`
    }
  };

  // ========== 默认风格 ==========
  const DEFAULT_STYLE = 'casual';

  // ========== 构建 Prompt ==========
  function buildPrompt(role, keywords, style) {
    const config = STYLE_CONFIG[style] || STYLE_CONFIG[DEFAULT_STYLE];
    const roleText = role ? `写周报的人岗位是：${role}。` : '';

    return {
      systemPrompt: config.systemPrompt,
      userPrompt: `${config.template}

${roleText}

以下是本周的工作关键词/草稿：
"""
${keywords}
"""

请基于以上信息，生成一份完整的周报。直接输出周报内容，不需要额外的说明文字。`
    };
  }

  // ========== 输入校验 ==========
  function validate(keywords, apiKey) {
    const errors = [];
    if (!keywords || !keywords.trim()) {
      errors.push({ field: 'keywords', message: '请填写本周工作内容（关键词即可）' });
    }
    if (!apiKey || !apiKey.trim()) {
      errors.push({ field: 'apiKey', message: '请填写 DeepSeek API Key' });
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ========== API Key 基本格式校验 ==========
  function isValidApiKeyFormat(key) {
    // DeepSeek key 格式: sk- 开头，长度至少 20
    return typeof key === 'string' && /^sk-[a-zA-Z0-9]{10,}$/.test(key.trim());
  }

  // ========== 构建 API 请求体 ==========
  function buildRequestBody(systemPrompt, userPrompt, options) {
    const opts = options || {};
    return {
      model: opts.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens || 2000
    };
  }

  // ========== 解析 API 响应 ==========
  function parseApiResponse(data) {
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('API 返回格式异常，请重试');
    }
    const content = data.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error('AI 没有生成内容，请换一批关键词重试');
    }
    return content.trim();
  }

  // ========== 解析 API 错误 ==========
  function parseApiError(status, body) {
    const msg = body?.error?.message || '';
    if (status === 401) return 'API Key 无效，请检查后重试';
    if (status === 429) return '请求太频繁，请稍等几秒再试';
    if (status === 402 || msg.includes('insufficient')) return 'API 余额不足，请充值';
    if (status >= 500) return '服务器错误，请稍后重试';
    return msg || `请求失败 (${status})`;
  }

  // ========== 估算 token 用量 ==========
  function estimateTokens(text) {
    // 中文约 1 字 ≈ 1 token，英文约 1 词 ≈ 1.3 token
    // 粗略估算：总字符数 × 0.5（中英混合）
    return Math.ceil(text.length * 0.5);
  }

  // ========== 暴露 API ==========
  return {
    STYLE_CONFIG,
    DEFAULT_STYLE,
    buildPrompt,
    validate,
    isValidApiKeyFormat,
    buildRequestBody,
    parseApiResponse,
    parseApiError,
    estimateTokens
  };
}));
