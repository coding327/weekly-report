// ========== 引用核心模块 ==========
const WR = window.WeeklyReport;

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

// ========== 生成 ==========
async function generate() {
  const keywords = keywordsInput.value.trim();
  const style = styleSelect.value;
  const { apiKey } = await chrome.storage.local.get(['apiKey']);

  // 使用 core.js 的校验
  const validation = WR.validate(keywords, apiKey);
  if (!validation.valid) {
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '⚠️ ' + validation.errors[0].message;
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
    // 使用 core.js 构建 prompt 和请求体
    const { systemPrompt, userPrompt } = WR.buildPrompt('', keywords, style);
    const body = WR.buildRequestBody(systemPrompt, userPrompt);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(WR.parseApiError(response.status, err));
    }

    const data = await response.json();
    const result = WR.parseApiResponse(data);

    outputContent.className = 'output-content';
    outputContent.textContent = result;

    apiStatus.className = 'api-status success';
    apiStatus.textContent = '✅ 生成成功！';
  } catch (error) {
    outputContent.className = 'output-content';
    outputContent.textContent = '';
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '❌ ' + error.message;
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
