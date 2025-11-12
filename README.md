# Auto Code Review Agent

一个基于 AI 的自动代码审核系统，使用 Mastra 0.24.0、GraphQL 和 OpenAI，可部署到 Cloudflare Workers。

## 🎯 功能特性

- 🤖 **多 Agent 架构**：代码规范、安全审核、性能分析三大审核 Agent
- 🔄 **自动化工作流**：通过 GitHub Webhook 自动触发审核
- 📊 **GraphQL API**：提供灵活的查询和变更接口
- 🚀 **Serverless 部署**：可部署到 Cloudflare Workers
- 📝 **详细报告**：生成结构化的审核报告并发布到 GitHub

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
OPENAI_API_KEY=your-openai-api-key
GITHUB_TOKEN=your-github-token
WEBHOOK_SECRET=your-webhook-secret
```

### 3. 本地开发

```bash
npm run dev
```

服务将在 `http://localhost:8787` 启动。

### 4. 部署到 Cloudflare Workers

```bash
# 设置 secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put WEBHOOK_SECRET

# 部署
npm run deploy
```

## 📚 使用方式

### 方式 1: GitHub Webhook（推荐）

1. 在 GitHub 仓库设置中添加 Webhook
   - Payload URL: `https://your-worker.workers.dev/webhook`
   - Content type: `application/json`
   - Secret: 你的 WEBHOOK_SECRET
   - 选择事件：`Pull requests` 和 `Pushes`

2. 当有 PR 创建或 push 到主分支时，自动触发审核

### 方式 2: GraphQL API

访问 `https://your-worker.workers.dev/graphql` 使用 GraphQL Playground。

#### 审核 Pull Request

```graphql
mutation {
  reviewPullRequest(input: {
    owner: "owner-name"
    repo: "repo-name"
    pullNumber: 123
    githubToken: "your-github-token"
    openaiApiKey: "your-openai-key"
  }) {
    overallStatus
    overallScore
    summary
  }
}
```

## 📖 项目结构

```
auto-code-review-agent/
├── src/
│   ├── agents/          # AI Agents
│   ├── tools/           # 工具集
│   ├── workflows/       # 工作流
│   ├── graphql/         # GraphQL
│   ├── types/           # 类型定义
│   ├── mastra.ts        # Mastra 实例
│   ├── webhook.ts       # Webhook 处理
│   └── index.ts         # 主入口
├── package.json
├── tsconfig.json
└── wrangler.toml
```

## 🔧 技术栈

- **Mastra 0.24.0**: AI Agent 框架
- **OpenAI GPT-4**: 代码分析引擎
- **GraphQL**: API 接口
- **Cloudflare Workers**: Serverless 部署
- **TypeScript**: 类型安全

## 📝 License

MIT
