import { LegacyWorkflow as Workflow, LegacyStep as Step } from '@mastra/core/workflows/legacy';
import { z } from 'zod';
import { reviewCodeStandards } from '../agents/code-standards-agent.js';
import { reviewSecurity } from '../agents/security-agent.js';
import { reviewPerformance } from '../agents/performance-agent.js';
import { GitHubTool, formatReviewMarkdown } from '../tools/github.js';
import { CodeReviewReport, ReviewResult, FileChange } from '../types/index.js';

/**
 * 代码审核工作流输入
 */
const workflowInputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number().optional(),
  commitSha: z.string(),
  branch: z.string(),
  githubToken: z.string(),
  openaiApiKey: z.string(),
});

/**
 * 代码审核工作流
 */
export function createCodeReviewWorkflow() {
  const workflow = new Workflow({
    name: 'code-review-workflow',
    triggerSchema: workflowInputSchema,
  });
  console.info('Created workflow:', workflow);
  // Step 1: 获取文件变更
  workflow
    .step({
      id: 'fetch-files',
      execute: async ({ context }) => {
        console.log('Fetching changed files...',context);
        const { owner, repo, pullNumber, commitSha, githubToken } = context.triggerData;
        const githubTool = new GitHubTool(githubToken);

        let files: FileChange[];

        if (pullNumber) {
          files = await githubTool.getPRFiles(owner, repo, pullNumber);
        } else {
          files = await githubTool.getCommitFiles(owner, repo, commitSha);
        }

        // 获取文件内容
        for (const file of files) {
          if (file.status !== 'removed') {
            try {
              file.content = await githubTool.getFileContent(
                owner,
                repo,
                file.filename,
                commitSha
              );
            } catch (error) {
              console.error(`Error fetching content for ${file.filename}`);
            }
          }
        }

        return { files };
      },
    })
    // Step 2: 运行代码规范审核
    .step({
      id: 'code-standards-review',
      execute: async ({ context, machineContext }) => {
        console.log('Executing code-standards-review step...',context);
        const { openaiApiKey } = context.triggerData;
        const previousStep = machineContext?.getStepPayload('fetch-files');
        const files = previousStep?.files || [];

        const result = await reviewCodeStandards(files, openaiApiKey);

        return { codeStandardsResult: result };
      },
    })
    // Step 3: 运行安全审核
    .step({
      id: 'security-review',
      execute: async ({ context, machineContext }) => {
        const { openaiApiKey } = context.triggerData;
        const previousStep = machineContext?.getStepPayload('fetch-files');
        const files = previousStep?.files || [];

        const result = await reviewSecurity(files, openaiApiKey);

        return { securityResult: result };
      },
    })
    // Step 4: 运行性能审核
    .step({
      id: 'performance-review',
      execute: async ({ context, machineContext }) => {
        console.log('Executing performance-review step...',context);
        const { openaiApiKey } = context.triggerData;
        const previousStep = machineContext?.getStepPayload('fetch-files');
        const files = previousStep?.files || [];

        const result = await reviewPerformance(files, openaiApiKey);

        return { performanceResult: result };
      },
    })
    // Step 5: 汇总结果
    .step({
      id: 'aggregate-results',
      execute: async ({ context, machineContext }) => {
        console.log('Aggregating results...',context);
        const { owner, repo, commitSha, branch } = context.triggerData;

        const codeStandardsStep = machineContext?.getStepPayload('code-standards-review');
        const securityStep = machineContext?.getStepPayload('security-review');
        const performanceStep = machineContext?.getStepPayload('performance-review');

        const codeStandardsResult = codeStandardsStep?.codeStandardsResult;
        const securityResult = securityStep?.securityResult;
        const performanceResult = performanceStep?.performanceResult;

        const results = [codeStandardsResult, securityResult, performanceResult].filter(Boolean);

        // 计算总体得分
        const overallScore = Math.round(
          results.reduce((sum, r) => sum + (r?.score || 0), 0) / results.length
        );

        // 确定总体状态
        const hasFailure = results.some((r) => r?.status === 'failed');
        const hasWarning = results.some((r) => r?.status === 'warning');
        const overallStatus: 'passed' | 'warning' | 'failed' = hasFailure
          ? 'failed'
          : hasWarning
          ? 'warning'
          : 'passed';

        // 生成总结
        const summary = generateOverallSummary(results, overallScore, overallStatus);

        const report: CodeReviewReport = {
          repositoryName: `${owner}/${repo}`,
          commitSha,
          branch,
          timestamp: new Date().toISOString(),
          overallStatus,
          overallScore,
          results: results as ReviewResult[],
          summary,
        };

        return { report };
      },
    })
    // Step 6: 发布结果到 GitHub
    .step({
      id: 'post-results',
      execute: async ({ context, machineContext }) => {
        console.log('Fpost-results...',context);

        const { owner, repo, pullNumber, commitSha, githubToken } = context.triggerData;
        const aggregateStep = machineContext?.getStepPayload('aggregate-results');
        const report = aggregateStep?.report;

        if (!report) {
          throw new Error('No report generated');
        }

        const githubTool = new GitHubTool(githubToken);
        const markdown = formatReviewMarkdown(report);

        // 如果是 PR，发布评论和审核
        if (pullNumber) {
          await githubTool.createPRComment(owner, repo, pullNumber, markdown);

          // 根据结果创建审核
          const reviewEvent =
            report.overallStatus === 'passed'
              ? 'APPROVE'
              : report.overallStatus === 'failed'
              ? 'REQUEST_CHANGES'
              : 'COMMENT';

          await githubTool.createReview(
            owner,
            repo,
            pullNumber,
            reviewEvent as 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
            `AI Code Review: ${report.overallStatus.toUpperCase()}`
          );
        }

        // 创建 commit status
        const statusState =
          report.overallStatus === 'passed'
            ? 'success'
            : report.overallStatus === 'warning'
            ? 'success'
            : 'failure';

        await githubTool.createCommitStatus(
          owner,
          repo,
          commitSha,
          statusState as 'success' | 'failure',
          `Code Review: ${report.overallStatus} (Score: ${report.overallScore}/100)`
        );

        return { success: true, report };
      },
    })
    .commit();

  return workflow;
}

/**
 * 生成总体总结
 */
function generateOverallSummary(
  results: any[],
  overallScore: number,
  overallStatus: string
): string {
  const totalIssues = results.reduce((sum, r) => sum + (r?.issues?.length || 0), 0);

  let summary = `# Overall Code Review Summary\n\n`;
  summary += `**Status:** ${overallStatus.toUpperCase()}\n`;
  summary += `**Overall Score:** ${overallScore}/100\n`;
  summary += `**Total Issues:** ${totalIssues}\n\n`;

  if (totalIssues === 0) {
    summary += '✅ Excellent! No issues found across all review categories.\n';
  } else {
    summary += '## Review Breakdown:\n';
    for (const result of results) {
      if (result) {
        const emoji =
          result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        summary += `- ${emoji} ${result.agent}: ${result.issues?.length || 0} issue(s) (Score: ${result.score}/100)\n`;
      }
    }
  }

  return summary;
}
