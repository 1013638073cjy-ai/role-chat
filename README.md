
# RoleChat — 多角色 AI 智能对话平台

基于 React、TypeScript、Node.js 和 LangChain 开发的多角色 AI 对话应用，支持秘书型和朋友型助手切换，覆盖购物、投资、旅游等场景。

## 技术栈

- 前端：React、TypeScript、Vite、Ant Design、Zustand
- 后端：Node.js、Express、LangChain
- AI 模型：Qwen、Kimi、DeepSeek（阿里云百炼）
- Agent：LangChain ReAct Agent、Function Calling
- 工具：Tavily 联网搜索、自定义预算计算
- 交互：SSE、Markdown、代码高亮、Web Speech API

## 核心功能

1. 多角色 Prompt 和多场景切换
2. Zustand 会话管理及 localStorage 持久化
3. SSE 流式输出、批量更新、中断及异常重试
4. 基于 LangChain 的多模型工厂及模型路由
5. Agent 自主调用联网搜索和预算计算工具
6. Token 用量统计及参考成本估算
7. Markdown、代码高亮、语音输入与智能滚动

## 本地运行

要求：Node.js 20.19+ 或兼容版本。

安装依赖：

```bash
npm install
```

复制 `.env.example` 为 `.env`，填写阿里云百炼和 Tavily 的 API Key。

启动后端：

```bash
node server/index.js
```

启动前端：

```bash
npm run dev
```

访问 http://localhost:5173

## 性能优化

使用 requestAnimationFrame 合并流式文本状态更新，通过 ResizeObserver 实现智能滚动。

性能测试数据：

- 优化前 React 提交次数：待测量
- 优化后 React 提交次数：待测量
- 优化比例：待测量

## 在线演示

部署完成后补充 Demo 地址。

## 注意事项

- 不要将 API Key 提交到仓库。
- 在线演示需要访问码。
- Token 成本是参考价格估算，不代表实际扣款。
- 联网搜索结果仅供参考，价格和景点信息需要核实。
- 会话记录保存在当前浏览器 localStorage 中。
```

<text color="secondary" size="xs">README 中的性能数据与在线地址在完成测试和部署后再填写；没有验证过的结果不要提前写进去。</text>

另外，你还可以在 README 中放两三张项目截图，比如多角色聊天、Agent 工具调用、Token 统计页面。图片保存在项目的 `docs/images/` 目录即可。

---

# 五、任务 4：上传 GitHub

现在先把代码上传 GitHub。在线部署放在下一部分。

## 1. 创建 GitHub 仓库

打开 <Link url="https://github.com/new" title="GitHub 新建仓库"/>。

填写：

| 设置 | 内容 |
|---|---|
| Repository name | `role-chat` |
| Description | `Multi-role AI chat platform with LangChain Agents` |
| Visibility | Public |
| Add README | 不勾选（本地已有） |

点击 **Create repository**。

## 2. 在 VS Code 终端上传

确保当前终端位于 `role-chat` 根目录。

依次执行：

```bash
git init
git add .
git status
```

**先看 `git status` 输出。**

确认没有 `.env`、`node_modules` 和 `dist` 后，再执行：

```bash
git commit -m "feat: complete RoleChat AI platform"
git branch -M main
```

然后关联你刚创建的 GitHub 仓库：

```bash
git remote add origin https://github.com/你的用户名/role-chat.git
git push -u origin main
```

把 `你的用户名` 替换成自己的 GitHub 用户名。

如果提示 `remote origin already exists`，说明你已经设置过远程仓库，可以改用：

```bash
git remote set-url origin https://github.com/你的用户名/role-chat.git
git push -u origin main
```

首次推送可能需要通过浏览器登录 GitHub 完成授权。

上传后刷新 GitHub 仓库页面，应该能看到：

```text
role-chat/
├── server/
├── src/
├── public/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.ts
└── README.md
```

如果之前曾经把真实 API Key 提交进 Git 历史，即使现在加了 `.gitignore` 也不够，需要撤销泄露的密钥并重新生成。

---

# 六、任务 5：部署在线 Demo

这里我们采用最省事的方案：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **Render Web Service**
    <text color="secondary" size="xs">同时运行 Node.js API 和托管 React 静态页面</text>
  </box>
  <row justify="center"><icon name="arrow-down-up" color="secondary"/></row>
  <box border radius="md" padding={3} align="center">
    **Express**
    <text color="secondary" size="xs">/api/chat → LangChain Agent</text>
    <text color="secondary" size="xs">其他页面 → Vite 构建的 dist</text>
  </box>
  <row justify="center"><icon name="arrow-down-up" color="secondary"/></row>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" padding={3} radius="md" align="center">
        **阿里云百炼**
        <text color="secondary" size="2xs">模型接口</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" padding={3} radius="md" align="center">
        **Tavily**
        <text color="secondary" size="2xs">联网搜索</text>
      </box>
    </grid-item>
  </grid>
</box>

不过需要先解决一个问题：**不能让任何访问你 GitHub Demo 的人都无限调用 Qwen 和 Tavily**。

否则别人打开网页并反复发送问题，就会消耗你的免费额度，甚至产生费用。免费额度用完即停也需要继续保持开启。

## 1. 给 Node.js 增加演示访问码

### 文件：`server/index.js`（只添加，不替换）

在文件顶部的 import 后面，找到：

```javascript
const app = express()
```

在下面增加：

<CodeBlock language="javascript" editable>
// 在线演示访问保护
app.use('/api/chat', (req, res, next) => {
  const accessCode = process.env.DEMO_ACCESS_CODE

  // 本地未配置访问码时，保持原来的开发体验
  if (!accessCode) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: '演示服务未配置访问码'
      })
    }
    return next()
  }

  const provided = req.get('X-Demo-Code')

  if (provided !== accessCode) {
    return res.status(403).json({
      error: '演示访问码不正确'
    })
  }

  next()
})
