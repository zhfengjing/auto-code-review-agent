# GraphQL 查询示例

## 1. 触发完整代码审核

```graphql
mutation TriggerFullReview {
  triggerReview(input: {
    owner: "your-github-username"
    repo: "your-repo-name"
    sha: "abc123def456"
    branch: "main"
  }) {
    repositoryName
    commitSha
    branch
    timestamp
    overallStatus
    overallScore
    summary
    results {
      agent
      status
      score
      summary
      issues {
        severity
        type
        file
        line
        message
        suggestion
      }
    }
  }
}
```

## 2. 触发 Pull Request 审核

```graphql
mutation TriggerPRReview {
  triggerReview(input: {
    owner: "your-github-username"
    repo: "your-repo-name"
    sha: "abc123def456"
    branch: "feature-branch"
    pullNumber: 42
  }) {
    repositoryName
    commitSha
    overallStatus
    overallScore
    summary
    results {
      agent
      status
      score
      issues {
        severity
        message
        file
        line
      }
    }
  }
}
```

## 3. 仅获取摘要信息

```graphql
mutation QuickReview {
  triggerReview(input: {
    owner: "mycompany"
    repo: "backend-api"
    sha: "latest-commit-sha"
    branch: "develop"
  }) {
    overallStatus
    overallScore
    summary
  }
}
```

## 4. 健康检查

```graphql
query HealthCheck {
  health {
    status
    timestamp
    version
  }
}
```

## 使用 cURL 调用

### 触发审核

```bash
curl -X POST https://your-worker.workers.dev/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { triggerReview(input: { owner: \"username\", repo: \"repo-name\", sha: \"commit-sha\", branch: \"main\" }) { overallStatus overallScore summary } }"
  }'
```

### 健康检查

```bash
curl -X POST https://your-worker.workers.dev/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { health { status timestamp version } }"
  }'
```

## 使用 JavaScript/TypeScript

```typescript
async function triggerCodeReview(
  owner: string,
  repo: string,
  sha: string,
  branch: string
) {
  const response = await fetch('https://your-worker.workers.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        mutation TriggerReview($input: ReviewInput!) {
          triggerReview(input: $input) {
            overallStatus
            overallScore
            summary
            results {
              agent
              status
              score
              issues {
                severity
                message
              }
            }
          }
        }
      `,
      variables: {
        input: {
          owner,
          repo,
          sha,
          branch,
        },
      },
    }),
  });

  const data = await response.json();
  return data.data.triggerReview;
}

// 使用示例
const result = await triggerCodeReview(
  'mycompany',
  'my-repo',
  'abc123',
  'main'
);

console.log(`Review Status: ${result.overallStatus}`);
console.log(`Score: ${result.overallScore}/100`);
console.log(`Summary: ${result.summary}`);
```

## 使用 Python

```python
import requests
import json

def trigger_code_review(owner, repo, sha, branch):
    url = "https://your-worker.workers.dev/graphql"
    
    query = """
    mutation TriggerReview($input: ReviewInput!) {
        triggerReview(input: $input) {
            overallStatus
            overallScore
            summary
            results {
                agent
                status
                score
                issues {
                    severity
                    message
                    file
                }
            }
        }
    }
    """
    
    variables = {
        "input": {
            "owner": owner,
            "repo": repo,
            "sha": sha,
            "branch": branch
        }
    }
    
    response = requests.post(
        url,
        json={"query": query, "variables": variables},
        headers={"Content-Type": "application/json"}
    )
    
    return response.json()

# 使用示例
result = trigger_code_review("mycompany", "my-repo", "abc123", "main")
report = result["data"]["triggerReview"]

print(f"Review Status: {report['overallStatus']}")
print(f"Score: {report['overallScore']}/100")
print(f"Summary: {report['summary']}")

for agent_result in report["results"]:
    print(f"\n{agent_result['agent']}: {agent_result['status']} ({agent_result['score']}/100)")
    for issue in agent_result['issues']:
        print(f"  - [{issue['severity']}] {issue['message']}")
```

## 在 GitHub Actions 中使用

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger AI Code Review
        run: |
          curl -X POST https://your-worker.workers.dev/graphql \
            -H "Content-Type: application/json" \
            -d "{
              \"query\": \"mutation { triggerReview(input: { owner: \\\"${{ github.repository_owner }}\\\", repo: \\\"${{ github.event.repository.name }}\\\", sha: \\\"${{ github.event.pull_request.head.sha }}\\\", branch: \\\"${{ github.event.pull_request.head.ref }}\\\", pullNumber: ${{ github.event.pull_request.number }} }) { overallStatus overallScore summary } }\"
            }"
```

## 响应示例

### 成功的审核响应

```json
{
  "data": {
    "triggerReview": {
      "repositoryName": "mycompany/backend-api",
      "commitSha": "abc123def456",
      "branch": "main",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "overallStatus": "PASSED",
      "overallScore": 87,
      "summary": "Found 3 issue(s) across 4 review categories. 2 high-priority issue(s) should be addressed. 3 out of 4 categories passed.",
      "results": [
        {
          "agent": "Code Standards",
          "status": "PASSED",
          "score": 92,
          "summary": "Code follows good naming conventions and structure.",
          "issues": [
            {
              "severity": "LOW",
              "type": "naming",
              "file": "src/utils/helper.ts",
              "line": 15,
              "message": "Consider using more descriptive variable name instead of 'tmp'",
              "suggestion": "Use 'processedData' or similar descriptive name"
            }
          ]
        },
        {
          "agent": "Security",
          "status": "WARNING",
          "score": 75,
          "summary": "Found potential security concerns that should be addressed.",
          "issues": [
            {
              "severity": "HIGH",
              "type": "data-exposure",
              "file": "src/config/database.ts",
              "line": 8,
              "message": "Database password appears to be hardcoded",
              "suggestion": "Move sensitive credentials to environment variables"
            }
          ]
        },
        {
          "agent": "Performance",
          "status": "PASSED",
          "score": 88,
          "summary": "No significant performance issues detected.",
          "issues": []
        },
        {
          "agent": "Best Practices",
          "status": "PASSED",
          "score": 85,
          "summary": "Code generally follows best practices with minor improvements possible.",
          "issues": [
            {
              "severity": "MEDIUM",
              "type": "error-handling",
              "file": "src/api/users.ts",
              "line": 42,
              "message": "Missing error handling for async operation",
              "suggestion": "Wrap in try-catch block or use .catch() handler"
            }
          ]
        }
      ]
    }
  }
}
```

### 失败的审核响应

```json
{
  "data": {
    "triggerReview": {
      "repositoryName": "mycompany/frontend-app",
      "commitSha": "def789ghi012",
      "branch": "feature/user-auth",
      "timestamp": "2024-01-15T11:00:00.000Z",
      "overallStatus": "FAILED",
      "overallScore": 45,
      "summary": "Found 12 issue(s) across 4 review categories. ⚠️ 2 critical issue(s) require immediate attention. 5 high-priority issue(s) should be addressed. 1 out of 4 categories passed.",
      "results": [
        {
          "agent": "Security",
          "status": "FAILED",
          "score": 30,
          "summary": "Critical security vulnerabilities detected that must be fixed immediately.",
          "issues": [
            {
              "severity": "CRITICAL",
              "type": "injection",
              "file": "src/api/login.ts",
              "line": 25,
              "message": "SQL injection vulnerability - user input concatenated directly into query",
              "suggestion": "Use parameterized queries or ORM with proper escaping"
            },
            {
              "severity": "CRITICAL",
              "type": "auth",
              "file": "src/middleware/auth.ts",
              "line": 10,
              "message": "JWT secret is hardcoded in source code",
              "suggestion": "Move JWT secret to environment variables"
            }
          ]
        }
      ]
    }
  }
}
```
