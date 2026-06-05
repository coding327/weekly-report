// ========== 引用核心模块 ==========
const WR = window.WeeklyReport;

// ========== DOM 元素 ==========
const roleInput = document.getElementById('role');
const keywordsInput = document.getElementById('keywords');
const styleSelect = document.getElementById('style');
const apiKeyInput = document.getElementById('apiKey');
const generateBtn = document.getElementById('generateBtn');
const apiStatus = document.getElementById('apiStatus');
const outputSection = document.getElementById('outputSection');
const outputContent = document.getElementById('outputContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

const btnText = generateBtn.querySelector('.btn-text');
const btnLoading = generateBtn.querySelector('.btn-loading');

// ========== 初始化：从 localStorage 恢复 API Key ==========
const savedKey = localStorage.getItem('weekly_report_api_key');
if (savedKey) {
  apiKeyInput.value = savedKey;
}

// ========== 调用 DeepSeek API ==========
async function callDeepSeek(apiKey, systemPrompt, userPrompt) {
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
  return WR.parseApiResponse(data);
}

// ========== Toast 提示 ==========
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ========== 生成周报 ==========
async function generate() {
  const role = roleInput.value.trim();
  const keywords = keywordsInput.value.trim();
  const style = styleSelect.value;
  const apiKey = apiKeyInput.value.trim();

  // 校验
  const validation = WR.validate(keywords, apiKey);
  if (!validation.valid) {
    apiStatus.className = 'api-status error';
    apiStatus.textContent = '⚠️ ' + validation.errors[0].message;
    if (validation.errors[0].field === 'keywords') keywordsInput.focus();
    else apiKeyInput.focus();
    return;
  }

  // 保存 API Key
  localStorage.setItem('weekly_report_api_key', apiKey);

  // UI: loading
  generateBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  apiStatus.className = 'api-status';
  apiStatus.textContent = '';

  outputSection.style.display = 'block';
  outputContent.className = 'output-content loading';
  outputContent.textContent = '🤖 AI 正在帮你写周报...';

  try {
    const { systemPrompt, userPrompt } = WR.buildPrompt(role, keywords, style);
    const result = await callDeepSeek(apiKey, systemPrompt, userPrompt);

    outputContent.className = 'output-content';
    outputContent.textContent = result;
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    apiStatus.className = 'api-status success';
    apiStatus.textContent = '✅ 周报生成成功！点击下方按钮复制或下载';
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
async function copy() {
  const text = outputContent.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ 已复制到剪贴板！');
  } catch {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('✅ 已复制到剪贴板！');
  }
}

// ========== 下载 ==========
function download() {
  const text = outputContent.textContent;
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  a.href = url;
  a.download = `周报_${dateStr}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 周报已下载！');
}

// ========== 事件绑定 ==========
generateBtn.addEventListener('click', generate);
copyBtn.addEventListener('click', copy);
downloadBtn.addEventListener('click', download);
regenerateBtn.addEventListener('click', generate);

// Ctrl+Enter 快捷键触发生成
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generate();
  }
});
