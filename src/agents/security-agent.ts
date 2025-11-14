import { Agent } from '@mastra/core';
import { OpenAITool } from '../tools/openai.js';
import { ReviewResult, Issue, FileChange } from '../types/index.js';

/**
 * 安全审核 Agent
 */
export function createSecurityAgent(openaiApiKey: string): Agent {
  return new Agent({
    name: 'Security Reviewer',
    instructions: `You are a security code reviewer. Your role is to:
1. Identify potential security vulnerabilities (SQL injection, XSS, CSRF, etc.)
2. Check for hardcoded secrets, API keys, or passwords
3. Verify proper input validation and sanitization
4. Check authentication and authorization logic
5. Identify insecure cryptographic practices
6. Check for vulnerable dependencies or libraries
7. Verify secure data handling and storage`,
    model: {
      provider: 'OPEN_AI',
      name: 'gpt-4o-mini',
      toolChoice: 'auto',
    },
  });
}

/**
 * 执行安全审核
 */
export async function reviewSecurity(
  files: FileChange[],
  openaiApiKey: string
): Promise<ReviewResult> {
  const openaiTool = new OpenAITool(openaiApiKey);
  const issues: Issue[] = [];
  let totalScore = 100;

  const systemPrompt = `You are a security code reviewer. Analyze the following code changes and identify:
1. Security vulnerabilities (injection attacks, XSS, CSRF, etc.)
2. Hardcoded secrets or credentials
3. Improper input validation
4. Authentication/authorization issues
5. Insecure cryptographic practices
6. Vulnerable dependencies
7. Data exposure risks

Return your analysis in JSON format:
{
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "type": "vulnerability|secrets|validation|auth|crypto|dependency|data-exposure",
      "file": "filename",
      "line": line_number,
      "message": "description",
      "suggestion": "how to fix"
    }
  ],
  "summary": "overall summary",
  "score": number (0-100)
}`;

  for (const file of files) {
    if (file.status === 'removed') continue;

    const fileContent = file.patch || '';
    if (!fileContent) continue;

    try {
      const result = await openaiTool.analyzeCodeStructured(
        systemPrompt,
        fileContent,
        {}
      );
      console.log(`security Analysis result for ${file.filename}:`);
      if (result.issues && Array.isArray(result.issues)) {
        for (const issue of result.issues) {
          issues.push({
            ...issue,
            file: file.filename,
          });

          const penalties = { low: 3, medium: 10, high: 20, critical: 40 };
          totalScore -= penalties[issue.severity as keyof typeof penalties] || 0;
        }
      }
    } catch (error) {
      console.error(`Error analyzing file ${file.filename}:`, error);
    }
  }

  totalScore = Math.max(0, totalScore);
  const status: 'passed' | 'warning' | 'failed' =
    totalScore >= 90 ? 'passed' : totalScore >= 70 ? 'warning' : 'failed';

  return {
    agent: 'Security Reviewer',
    status,
    issues,
    summary: generateSummary(issues, totalScore),
    score: totalScore,
  };
}

function generateSummary(issues: Issue[], score: number): string {
  if (issues.length === 0) {
    return '✅ No security issues found. Code appears secure.';
  }

  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  let summary = '🔒 Security Review: ';

  if (counts.critical > 0) {
    summary += `⚠️ CRITICAL: Found ${counts.critical} critical security issue(s) that must be addressed immediately! `;
  }

  summary += `Total: ${issues.length} security issue(s) detected: `;
  const parts = [];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${counts.low} low`);

  summary += parts.join(', ') + '. ';
  summary += `Security score: ${score}/100.`;

  return summary;
}
