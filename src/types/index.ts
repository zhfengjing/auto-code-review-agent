// 环境变量类型定义
export interface Env {
  OPENAI_API_KEY: string;
  GITHUB_TOKEN: string;
  WEBHOOK_SECRET: string;
  ENVIRONMENT?: string;
}

// GitHub Webhook 事件类型
export interface GitHubWebhookEvent {
  action: string;
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  pull_request?: {
    number: number;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
  };
  ref?: string;
  after?: string;
}

// 代码审核结果
export interface ReviewResult {
  agent: string;
  status: 'passed' | 'warning' | 'failed';
  issues: Issue[];
  summary: string;
  score: number;
}

export interface Issue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  file?: string;
  line?: number;
  message: string;
  suggestion?: string;
}

// 综合审核报告
export interface CodeReviewReport {
  repositoryName: string;
  commitSha: string;
  branch: string;
  timestamp: string;
  overallStatus: 'passed' | 'warning' | 'failed';
  overallScore: number;
  results: ReviewResult[];
  summary: string;
}

// 文件变更信息
export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  patch?: string;
  content?: string;
}
