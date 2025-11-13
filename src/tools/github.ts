import { Octokit } from '@octokit/rest';
import { FileChange } from '../types/index.js';

/**
 * GitHub 工具类 - 用于与 GitHub API 交互
 */
export class GitHubTool {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * 获取 Pull Request 的文件变更
   */
  async getPRFiles(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<FileChange[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });
    console.log('getPRFiles data:', data);
    return data.map((file) => ({
      filename: file.filename,
      status: file.status as 'added' | 'modified' | 'removed',
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  }

  /**
   * 获取文件内容
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      console.log('getFileContent data:', data);
      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return '';
    } catch (error) {
      console.error(`Error fetching file content: ${path}`, error);
      return '';
    }
  }

  /**
   * 在 PR 上发表评论
   */
  async createPRComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
  ): Promise<void> {
    console.log('Creating PR comment with body:', body);
    console.log('Owner:', owner, 'Repo:', repo, 'Pull Number:', pullNumber);
    console.log('Octokit instance:', this.octokit);
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });
  }

  /**
   * 在 PR 上创建审核
   */
  async createReview(
    owner: string,
    repo: string,
    pullNumber: number,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body: string
  ): Promise<void> {
    console.log('Creating PR review with body:', body);
    await this.octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event,
      body,
    });
  }

  /**
   * 获取 commit 的文件变更
   */
  async getCommitFiles(
    owner: string,
    repo: string,
    sha: string
  ): Promise<FileChange[]> {
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    return (data.files || []).map((file) => ({
      filename: file.filename,
      status: file.status as 'added' | 'modified' | 'removed',
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    }));
  }

  /**
   * 在 commit 上创建状态检查
   */
  async createCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    state: 'success' | 'failure' | 'pending' | 'error',
    description: string,
    context: string = 'AI Code Review'
  ): Promise<void> {
    await this.octokit.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      description,
      context,
    });
  }
}

/**
 * 格式化审核报告为 Markdown
 */
export function formatReviewMarkdown(report: any): string {
  const { overallStatus, overallScore, results, summary } = report;

  const statusEmoji =
    overallStatus === 'passed'
      ? '✅'
      : overallStatus === 'warning'
      ? '⚠️'
      : '❌';

  let markdown = `# ${statusEmoji} AI Code Review Report\n\n`;
  markdown += `**Overall Status:** ${overallStatus.toUpperCase()}\n`;
  markdown += `**Overall Score:** ${overallScore}/100\n\n`;
  markdown += `## Summary\n${summary}\n\n`;
  markdown += `---\n\n`;

  for (const result of results) {
    const agentEmoji =
      result.status === 'passed'
        ? '✅'
        : result.status === 'warning'
        ? '⚠️'
        : '❌';

    markdown += `## ${agentEmoji} ${result.agent}\n\n`;
    markdown += `**Status:** ${result.status}\n`;
    markdown += `**Score:** ${result.score}/100\n\n`;
    markdown += `${result.summary}\n\n`;

    if (result.issues && result.issues.length > 0) {
      markdown += `### Issues Found (${result.issues.length})\n\n`;

      for (const issue of result.issues) {
        const severityEmoji =
          issue.severity === 'critical'
            ? '🔴'
            : issue.severity === 'high'
            ? '🟠'
            : issue.severity === 'medium'
            ? '🟡'
            : '🟢';

        markdown += `${severityEmoji} **${issue.severity.toUpperCase()}** - ${issue.type}\n`;
        if (issue.file) {
          markdown += `   - File: \`${issue.file}\``;
          if (issue.line) markdown += ` (Line ${issue.line})`;
          markdown += `\n`;
        }
        markdown += `   - ${issue.message}\n`;
        if (issue.suggestion) {
          markdown += `   - 💡 Suggestion: ${issue.suggestion}\n`;
        }
        markdown += `\n`;
      }
    }

    markdown += `---\n\n`;
  }

  markdown += `\n*Generated by AI Code Review Agent*\n`;

  return markdown;
}
