/**
 * AI 周报生成器 - 核心逻辑单元测试
 * 使用 Node.js 内置 test runner（node --test）
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// 加载 core.js（UMD 兼容 Node）
const path = require('path');
// 模拟浏览器 window 对象，然后用 vm 加载
const fs = require('fs');
const vm = require('vm');

const corePath = path.join(__dirname, '..', 'web-version', 'core.js');
const coreCode = fs.readFileSync(corePath, 'utf-8');

// 在沙箱中执行，获取导出
const sandbox = { module: { exports: {} } };
vm.runInNewContext(coreCode, sandbox);
const WR = sandbox.module.exports;

// ============================================================
//  STYLE_CONFIG
// ============================================================
describe('STYLE_CONFIG', () => {
  it('应包含全部 4 种风格', () => {
    const styles = Object.keys(WR.STYLE_CONFIG);
    assert.deepStrictEqual(styles.sort(), ['casual', 'detailed', 'professional', 'startup'].sort());
  });

  it('每种风格应有 label、systemPrompt、template 三个字段', () => {
    for (const [key, config] of Object.entries(WR.STYLE_CONFIG)) {
      assert.ok(config.label, `${key}: 缺少 label`);
      assert.ok(config.systemPrompt, `${key}: 缺少 systemPrompt`);
      assert.ok(config.template, `${key}: 缺少 template`);
    }
  });

  it('systemPrompt 都应包含"周报"关键词', () => {
    for (const [key, config] of Object.entries(WR.STYLE_CONFIG)) {
      assert.ok(config.systemPrompt.includes('周报'), `${key}: systemPrompt 不包含"周报"`);
    }
  });
});

// ============================================================
//  buildPrompt()
// ============================================================
describe('buildPrompt', () => {
  it('应返回包含 systemPrompt 和 userPrompt 的对象', () => {
    const result = WR.buildPrompt('后端开发', '修了bug', 'casual');
    assert.ok(typeof result.systemPrompt === 'string');
    assert.ok(typeof result.userPrompt === 'string');
    assert.ok(result.systemPrompt.length > 0);
    assert.ok(result.userPrompt.length > 0);
  });

  it('userPrompt 应包含用户输入的关键词', () => {
    const result = WR.buildPrompt('', '修复了支付接口的超时问题', 'casual');
    assert.ok(result.userPrompt.includes('支付接口的超时问题'));
  });

  it('userPrompt 应包含岗位信息（如果提供）', () => {
    const result = WR.buildPrompt('产品经理', '写了PRD', 'casual');
    assert.ok(result.userPrompt.includes('产品经理'));
  });

  it('不提供岗位时不应包含岗位提示', () => {
    const result = WR.buildPrompt('', '写了一堆代码', 'casual');
    assert.ok(!result.userPrompt.includes('岗位是'));
  });

  it('4 种风格都应生成不同的 systemPrompt', () => {
    const results = {};
    for (const style of ['casual', 'professional', 'detailed', 'startup']) {
      results[style] = WR.buildPrompt('开发', '写代码', style);
    }
    // 所有 systemPrompt 应该不同
    const sysPrompts = Object.values(results).map(r => r.systemPrompt);
    const unique = new Set(sysPrompts);
    assert.strictEqual(unique.size, 4, '4 种风格应有 4 个不同的 systemPrompt');
  });

  it('所有风格的 userPrompt 都应包含关键词', () => {
    for (const style of ['casual', 'professional', 'detailed', 'startup']) {
      const r = WR.buildPrompt('', '测试关键词ABC', style);
      assert.ok(r.userPrompt.includes('测试关键词ABC'), `${style}: 不包含关键词`);
    }
  });

  it('不存在的风格应回退到默认风格', () => {
    const result = WR.buildPrompt('', 'test', 'nonexistent_style');
    assert.ok(result.systemPrompt.length > 0);
    assert.ok(result.userPrompt.length > 0);
  });

  it('空关键词也能生成 prompt（不做校验，校验在外层）', () => {
    const result = WR.buildPrompt('', '', 'casual');
    assert.ok(result.userPrompt.includes('"""'));
  });

  it('引号包裹的关键词区域应存在', () => {
    const result = WR.buildPrompt('', 'coding', 'casual');
    assert.ok(result.userPrompt.includes('"""'));
    // 应该有两个 """ 包裹
    const matches = result.userPrompt.match(/"""/g);
    assert.strictEqual(matches.length, 2);
  });
});

// ============================================================
//  validate()
// ============================================================
describe('validate', () => {
  it('空 keywords 和空 apiKey → 校验失败', () => {
    const v = WR.validate('', '');
    assert.strictEqual(v.valid, false);
    assert.strictEqual(v.errors.length, 2);
  });

  it('有 keywords 无 apiKey → 校验失败', () => {
    const v = WR.validate('写了代码', '');
    assert.strictEqual(v.valid, false);
    assert.strictEqual(v.errors.length, 1);
    assert.strictEqual(v.errors[0].field, 'apiKey');
  });

  it('无 keywords 有 apiKey → 校验失败', () => {
    const v = WR.validate('', 'sk-abc123');
    assert.strictEqual(v.valid, false);
    assert.strictEqual(v.errors.length, 1);
    assert.strictEqual(v.errors[0].field, 'keywords');
  });

  it('有 keywords 和 apiKey → 校验通过', () => {
    const v = WR.validate('写了代码', 'sk-abc123');
    assert.strictEqual(v.valid, true);
    assert.strictEqual(v.errors.length, 0);
  });

  it('仅空格 keywords → 视为空，校验失败', () => {
    const v = WR.validate('   ', 'sk-abc');
    assert.strictEqual(v.valid, false);
    assert.strictEqual(v.errors[0].field, 'keywords');
  });
});

// ============================================================
//  isValidApiKeyFormat()
// ============================================================
describe('isValidApiKeyFormat', () => {
  it('合法的 DeepSeek Key 格式 → true', () => {
    assert.strictEqual(WR.isValidApiKeyFormat('sk-abc123def456'), true);
    assert.strictEqual(WR.isValidApiKeyFormat('sk-a1b2c3d4e5f6g7h8'), true);
  });

  it('不以 sk- 开头 → false', () => {
    assert.strictEqual(WR.isValidApiKeyFormat('abc-1234567890'), false);
    assert.strictEqual(WR.isValidApiKeyFormat('pk-1234567890'), false);
  });

  it('太短（< 10 个字符在 sk- 之后）→ false', () => {
    assert.strictEqual(WR.isValidApiKeyFormat('sk-abc'), false);
    assert.strictEqual(WR.isValidApiKeyFormat('sk-12345'), false);
  });

  it('空字符串 → false', () => {
    assert.strictEqual(WR.isValidApiKeyFormat(''), false);
  });

  it('非字符串 → false', () => {
    assert.strictEqual(WR.isValidApiKeyFormat(null), false);
    assert.strictEqual(WR.isValidApiKeyFormat(undefined), false);
    assert.strictEqual(WR.isValidApiKeyFormat(123), false);
  });
});

// ============================================================
//  buildRequestBody()
// ============================================================
describe('buildRequestBody', () => {
  it('应包含 model、messages、temperature、max_tokens', () => {
    const body = WR.buildRequestBody('system prompt', 'user prompt');
    assert.strictEqual(body.model, 'deepseek-chat');
    assert.strictEqual(body.messages.length, 2);
    assert.strictEqual(body.messages[0].role, 'system');
    assert.strictEqual(body.messages[0].content, 'system prompt');
    assert.strictEqual(body.messages[1].role, 'user');
    assert.strictEqual(body.messages[1].content, 'user prompt');
    assert.strictEqual(body.temperature, 0.8);
    assert.strictEqual(body.max_tokens, 2000);
  });

  it('应支持自定义 options', () => {
    const body = WR.buildRequestBody('sys', 'user', { model: 'deepseek-reasoner', temperature: 0.5, maxTokens: 500 });
    assert.strictEqual(body.model, 'deepseek-reasoner');
    assert.strictEqual(body.temperature, 0.5);
    assert.strictEqual(body.max_tokens, 500);
  });

  it('不传 options 不应报错', () => {
    const body = WR.buildRequestBody('sys', 'user');
    assert.ok(body.model);
    assert.ok(body.messages);
  });
});

// ============================================================
//  parseApiResponse()
// ============================================================
describe('parseApiResponse', () => {
  it('正常响应 → 返回内容', () => {
    const data = {
      choices: [{ message: { content: '这是生成的周报内容\n- 项目A已完成' } }]
    };
    const result = WR.parseApiResponse(data);
    assert.strictEqual(result, '这是生成的周报内容\n- 项目A已完成');
  });

  it('空 choices → 抛出异常', () => {
    assert.throws(() => WR.parseApiResponse({ choices: [] }), /格式异常/);
  });

  it('无 choices → 抛出异常', () => {
    assert.throws(() => WR.parseApiResponse({}), /格式异常/);
  });

  it('null 输入 → 抛出异常', () => {
    assert.throws(() => WR.parseApiResponse(null), /格式异常/);
  });

  it('content 为空 → 抛出异常', () => {
    const data = { choices: [{ message: { content: '' } }] };
    assert.throws(() => WR.parseApiResponse(data), /没有生成内容/);
  });

  it('content 仅空格 → 抛出异常', () => {
    const data = { choices: [{ message: { content: '   ' } }] };
    assert.throws(() => WR.parseApiResponse(data), /没有生成内容/);
  });
});

// ============================================================
//  parseApiError()
// ============================================================
describe('parseApiError', () => {
  it('401 → API Key 无效', () => {
    const msg = WR.parseApiError(401, {});
    assert.ok(msg.includes('API Key 无效'));
  });

  it('429 → 请求太频繁', () => {
    const msg = WR.parseApiError(429, {});
    assert.ok(msg.includes('太频繁'));
  });

  it('402 → 余额不足', () => {
    const msg = WR.parseApiError(402, {});
    assert.ok(msg.includes('余额不足'));
  });

  it('insufficient 错误信息 → 余额不足', () => {
    const msg = WR.parseApiError(400, { error: { message: 'insufficient_quota' } });
    assert.ok(msg.includes('余额不足'));
  });

  it('500+ → 服务器错误', () => {
    const msg = WR.parseApiError(500, {});
    assert.ok(msg.includes('服务器错误'));
  });

  it('其他错误 → 使用 API 返回的 message', () => {
    const msg = WR.parseApiError(400, { error: { message: 'invalid_request: bad parameter' } });
    assert.ok(msg.includes('invalid_request'));
  });

  it('无 message 时 → 显示状态码', () => {
    const msg = WR.parseApiError(418, {});
    assert.ok(msg.includes('418'));
  });
});

// ============================================================
//  estimateTokens()
// ============================================================
describe('estimateTokens', () => {
  it('中文文本估算', () => {
    const tokens = WR.estimateTokens('这是一段测试文本');
    assert.ok(tokens > 0);
    assert.ok(tokens < 50);
  });

  it('空文本 → 0', () => {
    assert.strictEqual(WR.estimateTokens(''), 0);
  });

  it('长文本估算应大于短文本', () => {
    const short = WR.estimateTokens('短');
    const long = WR.estimateTokens('这是一段比较长的中文文本用来测试token估算是否合理');
    assert.ok(long > short);
  });
});

// ============================================================
//  集成测试：模拟完整流程的数据转换
// ============================================================
describe('集成：buildPrompt → buildRequestBody → parseApiResponse 完整链路', () => {
  it('模拟完整请求-响应流程', () => {
    // 1. 构建 Prompt
    const { systemPrompt, userPrompt } = WR.buildPrompt('后端开发', '修复了登录bug\n对接了支付接口', 'professional');
    assert.ok(systemPrompt.includes('周报'));
    assert.ok(userPrompt.includes('登录bug'));
    assert.ok(userPrompt.includes('支付接口'));

    // 2. 构建请求体
    const body = WR.buildRequestBody(systemPrompt, userPrompt);
    assert.strictEqual(body.model, 'deepseek-chat');
    assert.strictEqual(body.messages.length, 2);

    // 3. 模拟 API 响应并解析
    const mockResponse = {
      choices: [{ message: { content: '## 本周完成\n1. 修复登录bug\n2. 对接支付接口' } }]
    };
    const result = WR.parseApiResponse(mockResponse);
    assert.ok(result.includes('登录bug'));
    assert.ok(result.includes('支付接口'));
  });
});

console.log('\n✅ 所有测试通过！');
