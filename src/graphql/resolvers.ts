import { getMastraInstance } from '../mastra.js';
import { Env } from '../types/index.js';

/**
 * GraphQL Resolvers
 */
export function createResolvers(env: Env) {
  const mastra = getMastraInstance(env);

  return {
    Query: {
      health: () => {
        return 'OK';
      },
      getReviewReport: async (_: any, args: { reportId: string }) => {
        throw new Error('Not implemented yet');
      },
    },
    Mutation: {
      reviewPullRequest: async (_: any, args: { input: any }) => {
        const { owner, repo, pullNumber, githubToken, openaiApiKey } = args.input;

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: githubToken });
        
        const { data: pr } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
        });

        const workflow = mastra.legacy_getWorkflow('codeReview');
        console.log('workflow:',workflow);
        const run = workflow.createRun();
        const result = await run.start({
          triggerData: {
            owner,
            repo,
            pullNumber,
            commitSha: pr.head.sha,
            branch: pr.head.ref,
            githubToken,
            openaiApiKey,
          },
        });

        const report = result.results?.['post-results']?.report;

        if (!report) {
          throw new Error('Failed to generate review report');
        }

        return {
          ...report,
          overallStatus: report.overallStatus.toUpperCase(),
          results: report.results.map((r: any) => ({
            ...r,
            status: r.status.toUpperCase(),
            issues: r.issues.map((i: any) => ({
              ...i,
              severity: i.severity.toUpperCase(),
            })),
          })),
        };
      },
      reviewCommit: async (_: any, args: { input: any }) => {
        const { owner, repo, commitSha, branch, githubToken, openaiApiKey } = args.input;

        const workflow = mastra.legacy_getWorkflow('codeReview');
        const run = workflow.createRun();
        const result = await run.start({
          triggerData: {
            owner,
            repo,
            commitSha,
            branch,
            githubToken,
            openaiApiKey,
          },
        });

        const report = result.results?.['post-results']?.report;

        if (!report) {
          throw new Error('Failed to generate review report');
        }

        return {
          ...report,
          overallStatus: report.overallStatus.toUpperCase(),
          results: report.results.map((r: any) => ({
            ...r,
            status: r.status.toUpperCase(),
            issues: r.issues.map((i: any) => ({
              ...i,
              severity: i.severity.toUpperCase(),
            })),
          })),
        };
      },
    },
  };
}
