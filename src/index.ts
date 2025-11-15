import { Hono } from 'hono';
import { createYoga } from 'graphql-yoga';
import { schema } from './graphql/schema.js';
import { createResolvers } from './graphql/resolvers.js';
import { handleGitHubWebhook, verifyWebhookSignature } from './webhook.js';
import { Env, GitHubWebhookEvent } from './types/index.js';

/**
 * Cloudflare Workers 入口
 */
const app = new Hono<{ Bindings: Env }>();

// 健康检查端点
app.get('/', (c) => {
  return c.json({
    name: 'Auto Code Review Agent',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      graphql: '/graphql',
      webhook: '/webhook',
    },
  });
});

// GraphQL 端点
app.all('/graphql', async (c) => {
  const env = c.env;
  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    landingPage: true,
    context: { env },
    graphiql: {
      title: 'Auto Code Review API',
    },
  });

  const resolvers = createResolvers(env);
  
  return yoga(c.req.raw, { ...c, resolvers });
});

// GitHub Webhook 端点
app.post('/webhook/github', async (c) => {

  const env = c.env;
  try {
    const payload = await c.req.text();
    const signature = c.req.header('X-Hub-Signature-256') || '';

    if (env.WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(
        payload,
        signature,
        env.WEBHOOK_SECRET
      );

      if (!isValid) {
        return c.json({ error: 'Invalid signature' }, 401);
      }
    }

    const event: GitHubWebhookEvent = JSON.parse(payload);
    const eventType = c.req.header('X-GitHub-Event');

    console.log(`Received GitHub webhook: ${eventType}`);

    if (!['push', 'pull_request'].includes(eventType || '')) {
      return c.json({ message: 'Event not supported' }, 200);
    }

    const result = await handleGitHubWebhook(event, env);
    console.log('Webhook handled with result:', result);
    if (result.success) {
      return c.json({ message: result.message }, 200);
    } else {
      return c.json({ error: result.message }, 500);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
});

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json(
    {
      error: err.message || 'Internal server error',
    },
    500
  );
});

export default app;
