# 📝 AI 周报生成器

> 输入你干了什么 → AI 帮你写成漂漂亮亮的周报。摸鱼神器。

🔗 **线上地址：https://coding327.github.io/weekly-report/**

---

## 两个版本

| 版本 | 目录 | 适合场景 |
|---|---|---|
| **Web 版** | `web-version/` | 浏览器打开即用，可部署到线上 |
| **Chrome 插件版** | `chrome-extension/` | 点击浏览器图标弹出，更方便 |

---

## 快速开始

### 1. 获取 DeepSeek API Key

去 [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) 注册，创建一个 API Key。

- 新用户送 500 万 tokens 免费额度
- 用完了充值 ¥1 能用几十次
- 生成一篇周报大约消耗 500-1000 tokens

### 2. Web 版 - 直接用

```
用浏览器打开 web-version/index.html 即可
```

或部署到线上（免费）：

**方案 A：Vercel（推荐，1分钟部署）**
1. 把 `web-version/` 文件夹内容上传到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入仓库
3. 直接上线，获得一个 `xxx.vercel.app` 域名

**方案 B：GitHub Pages**
1. 把 `web-version/` 内容推到 GitHub 仓库的 `main` 分支
2. Settings → Pages → 选 main 分支 → Save
3. `https://你的用户名.github.io/仓库名/`

### 3. Chrome 插件版 - 加载使用

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 右上角打开「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `chrome-extension/` 文件夹
5. 点击浏览器右上角扩展图标 → 固定到工具栏
6. 打开，填入 API Key，保存，开始使用

---

## 功能介绍

- **4 种周报风格**：专业正式 / 简洁干练 / 详细汇报 / 互联网风
- **可选填岗位**：让 AI 用更贴合你角色的语气写
- **关键词输入**：想到什么写什么，不用排版
- **一键复制 / 下载**：生成后直接粘贴到飞书/钉钉/邮件
- **换一版**：不满意点一下重新生成
- **Ctrl+Enter**：快捷键一键生成
- 🔒 **API Key 只存本地浏览器，不上传任何服务器**

---

## 技术栈

- 纯 HTML + CSS + JS（零依赖，无需构建）
- DeepSeek API（便宜、国内可用、中文效果好）
- Chrome Extension Manifest V3

---

## 成本

| 项目 | 费用 |
|---|---|
| DeepSeek API | ¥1 ≈ 几十篇周报 |
| 部署（Vercel/GitHub Pages） | 免费 |
| 域名（可选） | ¥0 |

> 成本几乎为零 👍
