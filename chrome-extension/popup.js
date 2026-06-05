// ========== DOM ==========
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');
const keywordsInput = document.getElementById('keywords');
const styleSelect = document.getElementById('style');
const generateBtn = document.getElementById('generateBtn');
const apiStatus = document.getElementById('apiStatus');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

const btnText = generateBtn.querySelector('.btn-text');
const btnLoading = generateBtn.querySelector('.btn-loading');

// ========== 初始化：从 chrome.storage 加载 Key ==========
chrome.storage.local.get(['apiKey'], (result) => {
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
    keyStatus.className = 'key-status success';
    keyStatus.textContent = '✅ Key 已就绪';
  }
});

// ========== 保存 Key ==========
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    keyStatus.className = 'key-status error';
    keyStatus.textContent = '请输入 Key';
    return;
  }
  chrome.storage.local.set({ apiKey: key }, () => {
    keyStatus.className = 'key-status success';
    keyStatus.textContent = '✅ Key 已保存';
    setTimeout(() => { keyStatus.textContent = ''; }, 2000);
  });
});

// ========== 风格 Prompt ==========
const stylePrompts = {
  professional: `请生成一份专业正式的周报，适合大厂风格。分为「本周完成」「下周计划」「风险与问题」「需要支持」四个板块。语言正式，每条有具体内容和量化数据。`,

  casual: `请生成一份简洁干练的周报。用简短的要点列出本周工作（3-6条），每条一句话讲清楚做了什么+结果。语言简洁不废话。`,

  detailed: `请生成一份详细的工作汇报。每条工作展开：背景→动作→结果→下一步。突出个人贡献和业务价值，用数据说话。`,

  startup: `请生成一份互联网风格的周报。格式：🚀 Progress / 🤔 Blockers / 📅 Next Week。可适当使用emoji，突出速度和迭代。`
};

// ========== 生成 ==========
async function generate() {
  const keywords = keywordsInput.value.trim();
  const style = styleSelect.value;
  const { apiKey } = await chrome.storage.local.get(['apiKey']);

  if (!keywords) {
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '⚠️ 先填一下这周干了什么';
    return;
  }
  if (!apiKey) {
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '⚠️ 请先填写并保存 API Key';
    return;
  }

  // UI: loading
  generateBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  apiStatus.textContent = '';

  outputSection.style.display = 'block';
  outputContent.className = 'output-content loading';
  outputContent.textContent = '🤖 生成中...';

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是周报撰写助手。只输出周报正文，不输出解释。' },
          { role: 'user', content: `${stylePrompts[style]}\n\n岗位：${keywords.includes('开发') ? '软件开发' : keywords.includes('产品') ? '产品经理' : '员工'}\n本周工作关键词：${keywords}\n\n请生成周报：` }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `请求失败 (${response.status})`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim();

    outputContent.className = 'output-content';
    outputContent.textContent = result;

    apiStatus.className = 'api-status success';
    apiStatus.textContent = '✅ 生成成功！';
  } catch (error) {
    outputContent.className = 'output-content';
    outputContent.textContent = '';
    apiStatus.className = 'api-status error';
    apiStatus.textContent = `❌ ${error.message}`;
  } finally {
    generateBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

// ========== 复制 ==========
copyBtn.addEventListener('click', async () => {
  const text = outputContent.textContent;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  // 短暂反馈
  copyBtn.textContent = '✅ 已复制';
  setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500);
});

// ========== 事件绑定 ==========
generateBtn.addEventListener('click', generate);
regenerateBtn.addEventListener('click', generate);

// Ctrl+Enter 快捷生成
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});
