# 部署指南

## 前置要求

1. Cloudflare 账号
2. GitHub 账号和个人访问令牌
3. OpenAI API 密钥
4. Node.js 18+ 和 npm

## 步骤 1: 安装 Wrangler CLI

```bash
npm install -g wrangler
```

## 步骤 2: 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

## 步骤 3: 配置 Secrets

在项目根目录下运行：

```bash
# 设置 OpenAI API Key
wrangler secret put OPENAI_API_KEY
# 输入: sk-...

# 设置 GitHub Token
wrangler secret put GITHUB_TOKEN
# 输入: ghp_...

# 设置 Webhook Secret (自己生成一个随机字符串)
wrangler secret put WEBHOOK_SECRET
# 输入: 例如 my-secret-webhook-key-123456
```

### 生成 Webhook Secret

可以使用以下命令生成一个随机 secret：

```bash
# macOS/Linux
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 步骤 4: 获取 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" > "Generate new token (classic)"
3. 给 token 一个描述性名称，如 "Code Review Agent"
4. 选择以下权限:
   - `repo` (完整的仓库访问)
   - `write:discussion` (写评论权限)
5. 点击 "Generate token"
6. 复制生成的 token (只显示一次!)

## 步骤 5: 部署到 Cloudflare Workers

```bash
npm run deploy
```

部署成功后，你会看到类似输出：

```
Published auto-code-review-agent (1.23 sec)
  https://auto-code-review-agent.your-subdomain.workers.dev
```

记下这个 URL，稍后配置 GitHub Webhook 时需要用到。

## 步骤 6: 配置 GitHub Webhook

### 6.1 进入仓库设置

1. 打开你要监控的 GitHub 仓库
2. 点击 Settings > Webhooks > Add webhook

### 6.2 配置 Webhook

- **Payload URL**: `https://auto-code-review-agent.your-subdomain.workers.dev/webhook/github`
- **Content type**: `application/json`
- **Secret**: 你在步骤 3 中设置的 WEBHOOK_SECRET
- **Which events would you like to trigger this webhook?**
  - 选择 "Let me select individual events"
  - 勾选:
    - ✅ Pushes
    - ✅ Pull requests
  - 取消勾选其他事件

### 6.3 保存配置

点击 "Add webhook"，GitHub 会立即发送一个 ping 事件来测试连接。

## 步骤 7: 测试

### 7.1 测试健康检查

```bash
curl https://auto-code-review-agent.your-subdomain.workers.dev/health
```

应该返回：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 7.2 测试 GraphQL

访问 `https://auto-code-review-agent.your-subdomain.workers.dev/graphql`

应该看到 GraphQL Playground 界面。

### 7.3 测试代码审核

创建一个测试 Pull Request：

1. 在你的仓库中创建一个新分支
2. 添加或修改一些代码文件
3. 创建 Pull Request

几秒钟后，你应该会看到 AI 代码审核的评论出现在 PR 中。

## 验证 Webhook 是否工作

1. 进入 GitHub 仓库的 Settings > Webhooks
2. 点击你刚创建的 webhook
3. 查看 "Recent Deliveries" 标签
4. 应该能看到最近的请求和响应

如果看到绿色的勾号 ✅，说明 webhook 配置成功！

## 故障排查

### Webhook 返回 401 Unauthorized

- 检查 WEBHOOK_SECRET 是否正确配置
- 确保 GitHub webhook 配置中的 Secret 与 Cloudflare 中设置的一致

### Webhook 返回 500 Internal Server Error

- 检查 Cloudflare Workers 日志: `wrangler tail`
- 确认 OPENAI_API_KEY 和 GITHUB_TOKEN 已正确设置

### OpenAI API 调用失败

- 验证 API Key 是否有效
- 检查 OpenAI 账户是否有足够的额度
- 查看 API 使用限制

### GitHub API 调用失败

- 验证 GitHub Token 权限是否正确
- 检查 Token 是否过期
- 确认仓库访问权限

## 查看日志

实时查看 Worker 日志：

```bash
wrangler tail
```

## 更新部署

修改代码后重新部署：

```bash
npm run deploy
```

## 回滚

如果需要回滚到之前的版本：

```bash
wrangler rollback
```

## 删除 Worker

```bash
wrangler delete
```

## 监控和成本

### Cloudflare Workers

- 免费版: 每天 100,000 次请求
- 付费版: $5/月，10,000,000 次请求

### OpenAI API

- GPT-4 Turbo: 约 $0.01 / 1K tokens (输入) + $0.03 / 1K tokens (输出)
- 每次代码审核大约使用 2,000-5,000 tokens
- 建议设置使用限额和监控

### GitHub API

- 免费版: 5,000 次请求/小时
- 通常足够使用

## 安全建议

1. **定期轮换密钥**: 定期更换 GitHub Token 和 OpenAI API Key
2. **限制权限**: GitHub Token 只授予必要的最小权限
3. **监控使用**: 定期检查 API 使用情况，防止滥用
4. **Webhook Secret**: 使用强随机字符串作为 webhook secret
5. **日志审查**: 定期查看 Worker 日志，检测异常活动
