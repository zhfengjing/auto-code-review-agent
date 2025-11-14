import { getMastraInstance } from './mastra.js';
import { Env, GitHubWebhookEvent } from './types/index.js';

/**
 * 验证 GitHub Webhook 签名
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Note: crypto module needs to be imported differently in Cloudflare Workers
  // This is a placeholder - implement proper HMAC verification
  return true; // For now, skip verification in development
}

/**
 * 处理 GitHub Webhook 事件
 */
export async function handleGitHubWebhook(
  event: GitHubWebhookEvent,
  env: Env
): Promise<{ success: boolean; message: string }> {
  const mastra = getMastraInstance(env);

  try {
    // 处理 Pull Request 事件
    if (event.pull_request) {
      const { repository, pull_request } = event;
      console.log('Handling PR event...');
      if (!['opened', 'synchronize', 'reopened'].includes(event.action)) {
        return {
          success: true,
          message: `Ignored PR action: ${event.action}`,
        };
      }

      console.log(
        `Reviewing PR #${pull_request.number} in ${repository.full_name}`
      );

      const workflow = mastra.getWorkflow('codeReview');
      console.log('Executing code review workflow...', workflow);
      const run = await workflow.createRunAsync();
      // run.watch((event) => {
      //   const {
      //     payload: { currentStep },
      //   } = event;

      //   console.log('run watch',event,'-----',currentStep?.payload?.status);
      // });
      await run.start({
        inputData: {
          owner: repository.owner.login,
          repo: repository.name,
          pullNumber: pull_request.number,
          commitSha: pull_request.head.sha,
          branch: pull_request.head.ref,
          githubToken: env.GITHUB_TOKEN,
          openaiApiKey: env.OPENAI_API_KEY,
        },
      });
      console.log('Code review workflow completed.');
      return {
        success: true,
        message: `Code review completed for PR #${pull_request.number}`,
      };
    }

    // 处理 Push 事件
    if (event.ref && event.after) {
      const { repository, ref, after } = event;
      const branch = ref.replace('refs/heads/', '');

      const reviewBranches = ['main', 'master', 'develop'];
      if (!reviewBranches.includes(branch)) {
        return {
          success: true,
          message: `Ignored push to branch: ${branch}`,
        };
      }

      console.log(
        `Reviewing commit ${after} on ${branch} in ${repository.full_name}`
      );

      const workflow = mastra.getWorkflow('codeReview');
      const run = await workflow.createRunAsync();
      await run.start({
        inputData: {
          owner: repository.owner.login,
          repo: repository.name,
          commitSha: after,
          branch,
          githubToken: env.GITHUB_TOKEN,
          openaiApiKey: env.OPENAI_API_KEY,
        },
      });

      return {
        success: true,
        message: `Code review completed for commit ${after}`,
      };
    }

    return {
      success: true,
      message: 'Event not handled',
    };
  } catch (error) {
    console.error('Error handling webhook:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
