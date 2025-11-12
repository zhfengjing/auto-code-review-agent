import { buildSchema } from 'graphql';

/**
 * GraphQL Schema
 */
export const schema = buildSchema(`
  type Query {
    "Get code review report by ID"
    getReviewReport(reportId: String!): CodeReviewReport
    
    "Health check"
    health: String!
  }

  type Mutation {
    "Trigger a code review for a Pull Request"
    reviewPullRequest(input: ReviewPRInput!): CodeReviewReport!
    
    "Trigger a code review for a commit"
    reviewCommit(input: ReviewCommitInput!): CodeReviewReport!
  }

  input ReviewPRInput {
    owner: String!
    repo: String!
    pullNumber: Int!
    githubToken: String!
    openaiApiKey: String!
  }

  input ReviewCommitInput {
    owner: String!
    repo: String!
    commitSha: String!
    branch: String!
    githubToken: String!
    openaiApiKey: String!
  }

  type CodeReviewReport {
    repositoryName: String!
    commitSha: String!
    branch: String!
    timestamp: String!
    overallStatus: ReviewStatus!
    overallScore: Int!
    results: [ReviewResult!]!
    summary: String!
  }

  type ReviewResult {
    agent: String!
    status: ReviewStatus!
    issues: [Issue!]!
    summary: String!
    score: Int!
  }

  type Issue {
    severity: IssueSeverity!
    type: String!
    file: String
    line: Int
    message: String!
    suggestion: String
  }

  enum ReviewStatus {
    PASSED
    WARNING
    FAILED
  }

  enum IssueSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
`);
