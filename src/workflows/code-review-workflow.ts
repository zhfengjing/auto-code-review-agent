import { createWorkflow, createStep } from '@mastra/core/workflows';
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
 * Step 1: 获取文件变更
 */
const fetchFilesStep = createStep({
  id: 'fetch-files',
  description: 'Fetch changed files from GitHub',
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    files: z.array(z.any()),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log('Fetching changed files...', inputData);
    const { owner, repo, pullNumber, commitSha, githubToken } = inputData;
    const githubTool = new GitHubTool(githubToken);

    let files: FileChange[];

    if (pullNumber) {
      files = await githubTool.getPRFiles(owner, repo, pullNumber);
    } else {
      files = await githubTool.getCommitFiles(owner, repo, commitSha);
    }
    console.log(`Fetched ${files.length} changed files metadata.`);

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
          console.error(`Error fetching content for ${file.filename}`, error);
        }
      }
    }
    console.log(`Fetched ${files.length} changed files with content.`);
    return { files, ...inputData};
  },
});

/**
 * Step 2: 运行代码规范审核
 */
const codeStandardsStep = createStep({
  id: 'code-standards-review',
  description: 'Review code standards',
  inputSchema: z.object({
    files: z.array(z.any()),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  outputSchema: z.object({
    result: z.any(),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  retries:3,
  execute: async ({ inputData, runCount }) => {
    console.log(`[Retry Check] Executing code-standards-review step... Attempt: ${runCount + 1}`, inputData.openaiApiKey);
    const { files, openaiApiKey } = inputData;
    const result = await reviewCodeStandards(files, openaiApiKey);
    console.log('Code standards review result:', Object.keys(result));
    return { result, ...inputData};
  },
});

/**
 * Step 3: 运行安全审核
 */
const securityStep = createStep({
  id: 'security-review',
  description: 'Review security issues',
  inputSchema: z.object({
    files: z.array(z.any()),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  outputSchema: z.object({
    result: z.any(),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  retries:3,
  execute: async ({ inputData, runCount }) => {
    console.log(`[Retry Check] Executing security-review step... Attempt: ${runCount + 1}`);
    const { files, openaiApiKey } = inputData;
    const result = await reviewSecurity(files, openaiApiKey);
    console.log('Security review result', Object.keys(result));
    return { result,...inputData };
  },
});

/**
 * Step 4: 运行性能审核
 */
const performanceStep = createStep({
  id: 'performance-review',
  description: 'Review performance issues',
  inputSchema: z.object({
    files: z.array(z.any()),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  outputSchema: z.object({
    result: z.any(),
     owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    branch: z.string(),
    githubToken: z.string(),
    openaiApiKey: z.string(),
  }),
  retries:3,
  execute: async ({ inputData, runCount }) => {
    console.log(`[Retry Check] Executing performance-review step... Attempt: ${runCount + 1}`);
    const { files, openaiApiKey } = inputData;
    const result = await reviewPerformance(files, openaiApiKey);
    console.log('Performance review result', Object.keys(result));
    return { result, ...inputData };
  },
});

/**
 * Step 5: 汇总结果
 */
const aggregateStep = createStep({
  id: 'aggregate-results',
  description: 'Aggregate review results',
  inputSchema: z.object({
    'code-standards-review': z.object({
      result: z.any(),
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number().optional(),
      commitSha: z.string(),
      branch: z.string(),
      githubToken: z.string(),
      openaiApiKey: z.string(),
    }),
    'security-review': z.object({
      result: z.any(),
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number().optional(),
      commitSha: z.string(),
      branch: z.string(),
      githubToken: z.string(),
      openaiApiKey: z.string(),
    }),
    'performance-review': z.object({
      result: z.any(),
      owner: z.string(),
      repo: z.string(),
      pullNumber: z.number().optional(),
      commitSha: z.string(),
      branch: z.string(),
      githubToken: z.string(),
      openaiApiKey: z.string(),
    }),
  }),
    outputSchema: z.object({
      report: z.any(),
      owner: z.string(),
      repo: z.string(),
      commitSha: z.string(),
      pullNumber: z.number().optional(),
      githubToken: z.string(),
    }),
  execute: async ({ inputData }) => {
    console.log('Aggregating results...', inputData);
    const codeStandardsStepRes = inputData['code-standards-review'];
    const codeStandardsResult = codeStandardsStepRes.result;
    const securityResult = inputData['security-review'].result;
    const performanceResult = inputData['performance-review'].result;
    const owner = codeStandardsStepRes.owner;
    const repo = codeStandardsStepRes.repo;
    const commitSha = codeStandardsStepRes.commitSha;
    const branch = codeStandardsStepRes.branch;
    const pullNumber = codeStandardsStepRes.pullNumber;
    const githubToken = codeStandardsStepRes.githubToken;

    const results = [codeStandardsResult, securityResult,performanceResult].filter(Boolean);
    console.log('Individual results to aggregate:', results);
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
    console.log('Generated overall summary:', summary); 
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
    console.log('Aggregated report:', report);
    return { report, pullNumber, owner, repo, commitSha, githubToken};
  },
});

/**
 * Step 6: 发布结果到 GitHub
 */
const postResultsStep = createStep({
  id: 'post-results',
  description: 'Post review results to GitHub',
  inputSchema: z.object({
    report: z.any(),
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().optional(),
    commitSha: z.string(),
    githubToken: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    report: z.any(),
  }),
  execute: async ({ inputData }) => {
    console.log('Executing post-results step...');
    const { report, owner, repo, pullNumber, commitSha, githubToken } = inputData;

    const githubTool = new GitHubTool(githubToken);
    const markdown = formatReviewMarkdown(report);
    console.log('Formatted markdown report.', markdown);

    // 如果是 PR，发布评论和审核
    if (pullNumber) {
      await githubTool.createPRComment(owner, repo, pullNumber, markdown);
      console.log('Posted PR comment.');

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
    console.log('Posted results to GitHub.');
    return { success: true, report };
  },
});

/**
 * 代码审核工作流
 */
export function createCodeReviewWorkflow() {
  const workflow = createWorkflow({
    id: 'code-review-workflow',
    inputSchema: workflowInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      report: z.any(),
    }),
    retryConfig: ({ attempts: 3, delay: 2000 }),
  })
    // Step 1: 获取文件变更
    .then(fetchFilesStep)
    // 使用 map 步骤将数据转换为审核步骤需要的格式
    // .map(({ inputData, getStepResult }) => { 
    //   console.log('Mapping input for parallel steps...', inputData);
    //   console.log('getStepResult(fetchFilesStep):',getStepResult(fetchFilesStep));
    //   return {
    //   files: getStepResult(fetchFilesStep).files,
    //   openaiApiKey: inputData.openaiApiKey,
    // }
    // })
    // Step 2-4: 并行运行三个审核步骤
    .parallel([codeStandardsStep, securityStep, performanceStep])
    // .parallel([codeStandardsStep, securityStep, performanceStep])
    // Step 5: 汇总结果 - 直接接收 parallel 步骤的输出
    .then(aggregateStep)
    // 使用 map 步骤将报告和原始输入合并
    // .map(async ({ inputData, getStepResult }) => ({
    //   report: getStepResult(aggregateStep).report,
    //   owner: inputData.owner,
    //   repo: inputData.repo,
    //   pullNumber: inputData.pullNumber,
    //   commitSha: inputData.commitSha,
    //   githubToken: inputData.githubToken,
    // }))
    // Step 6: 发布结果到 GitHub
    .then(postResultsStep)
    .commit();

  console.info('Created workflow:', workflow);
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
