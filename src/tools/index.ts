import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GitHubTool } from './github.js';
import { OpenAITool } from './openai.js';

/**
 * 创建 Mastra 工具 - 获取 PR 文件
 */
export const getPRFilesTool = createTool({
  id: 'get-pr-files',
  description: 'Get files changed in a Pull Request',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    pullNumber: z.number().describe('Pull request number'),
    githubToken: z.string().describe('GitHub token'),
  }),
  outputSchema: z.object({
    files: z.array(
      z.object({
        filename: z.string(),
        status: z.enum(['added', 'modified', 'removed']),
        additions: z.number(),
        deletions: z.number(),
        patch: z.string().optional(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { owner, repo, pullNumber, githubToken } = context;
    const githubTool = new GitHubTool(githubToken);
    const files = await githubTool.getPRFiles(owner, repo, pullNumber);
    return { files };
  },
});

/**
 * 创建 Mastra 工具 - 获取文件内容
 */
export const getFileContentTool = createTool({
  id: 'get-file-content',
  description: 'Get content of a file from GitHub',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('File path'),
    ref: z.string().describe('Git reference (branch, tag, or SHA)'),
    githubToken: z.string().describe('GitHub token'),
  }),
  outputSchema: z.object({
    content: z.string(),
  }),
  execute: async ({ context }) => {
    const { owner, repo, path, ref, githubToken } = context;
    const githubTool = new GitHubTool(githubToken);
    const content = await githubTool.getFileContent(owner, repo, path, ref);
    return { content };
  },
});

/**
 * 创建 Mastra 工具 - 分析代码
 */
export const analyzeCodeTool = createTool({
  id: 'analyze-code',
  description: 'Analyze code using OpenAI',
  inputSchema: z.object({
    systemPrompt: z.string().describe('System prompt for analysis'),
    codeContent: z.string().describe('Code content to analyze'),
    additionalContext: z.string().optional().describe('Additional context'),
    openaiApiKey: z.string().describe('OpenAI API key'),
  }),
  outputSchema: z.object({
    analysis: z.string(),
  }),
  execute: async ({ context }) => {
    const { systemPrompt, codeContent, additionalContext, openaiApiKey } = context;
    const openaiTool = new OpenAITool(openaiApiKey);
    const analysis = await openaiTool.analyzeCode(systemPrompt, codeContent, additionalContext);
    return { analysis };
  },
});

/**
 * 创建 Mastra 工具 - 发布 PR 评论
 */
export const postPRCommentTool = createTool({
  id: 'post-pr-comment',
  description: 'Post a comment on a Pull Request',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    pullNumber: z.number().describe('Pull request number'),
    body: z.string().describe('Comment body'),
    githubToken: z.string().describe('GitHub token'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { owner, repo, pullNumber, body, githubToken } = context;
    const githubTool = new GitHubTool(githubToken);
    await githubTool.createPRComment(owner, repo, pullNumber, body);
    return { success: true };
  },
});

/**
 * 创建 Mastra 工具 - 创建审核
 */
export const createReviewTool = createTool({
  id: 'create-review',
  description: 'Create a review on a Pull Request',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    pullNumber: z.number().describe('Pull request number'),
    event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review event'),
    body: z.string().describe('Review body'),
    githubToken: z.string().describe('GitHub token'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { owner, repo, pullNumber, event, body, githubToken } = context;
    const githubTool = new GitHubTool(githubToken);
    await githubTool.createReview(owner, repo, pullNumber, event, body);
    return { success: true };
  },
});

/**
 * 导出所有工具
 */
export const tools = {
  getPRFiles: getPRFilesTool,
  getFileContent: getFileContentTool,
  analyzeCode: analyzeCodeTool,
  postPRComment: postPRCommentTool,
  createReview: createReviewTool,
};
