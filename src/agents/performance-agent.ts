import { Agent } from '@mastra/core/agent';
import { OpenAITool } from '../tools/openai.js';
import { ReviewResult, Issue, FileChange } from '../types/index.js';

/**
 * 性能审核 Agent
 */
export function createPerformanceAgent(openaiApiKey: string): Agent {
  return new Agent({
    name: 'Performance Reviewer',
    instructions: `You are a performance code reviewer. Your role is to:
1. Identify performance bottlenecks and inefficient algorithms
2. Check for unnecessary computations or loops
3. Verify proper use of caching and memoization
4. Identify memory leaks and excessive memory usage
5. Check database query optimization
6. Verify proper async/await usage
7. Identify blocking operations`,
    model: {
      provider: 'OPEN_AI',
      name: 'gpt-4-turbo-preview',
      toolChoice: 'auto',
    },
  });
}

/**
 * 执行性能审核
 */
export async function reviewPerformance(
  files: FileChange[],
  openaiApiKey: string
): Promise<ReviewResult> {
  const openaiTool = new OpenAITool(openaiApiKey);
  const issues: Issue[] = [];
  let totalScore = 100;

  const systemPrompt = `You are a performance code reviewer. Analyze the following code changes and identify:
1. Performance bottlenecks
2. Inefficient algorithms or data structures
3. Unnecessary computations
4. Missing caching opportunities
5. Memory leaks
6. Inefficient database queries
7. Blocking operations

Return your analysis in JSON format:
{
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "type": "algorithm|computation|caching|memory|database|async|blocking",
      "file": "filename",
      "line": line_number,
      "message": "description",
      "suggestion": "optimization suggestion"
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
      let result = await openaiTool.analyzeCode(
        systemPrompt,
        fileContent,
      );
      console.log(`performance Analysis result for ${file.filename}:`,result);
      result = result.replace(/^```json\s*|\s*```$/gm, '');
      const {issues:issuesResult} = JSON.parse(result);
      if (issuesResult && Array.isArray(issuesResult)) {
        for (const issue of issuesResult) {
          issues.push({
            ...issue,
            file: file.filename,
          });

          const penalties = { low: 2, medium: 5, high: 15, critical: 30 };
          totalScore -= penalties[issue.severity as keyof typeof penalties] || 0;
        }
      }
    } catch (error) {
      console.error(`performance Error analyzing file ${file.filename}:`, error);
    }
  }

  totalScore = Math.max(0, totalScore);
  const status: 'passed' | 'warning' | 'failed' =
    totalScore >= 80 ? 'passed' : totalScore >= 60 ? 'warning' : 'failed';

  return {
    agent: 'Performance Reviewer',
    status,
    issues,
    summary: generateSummary(issues, totalScore),
    score: totalScore,
  };
}

function generateSummary(issues: Issue[], score: number): string {
  if (issues.length === 0) {
    return '✅ No performance issues found. Code is well-optimized.';
  }

  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  let summary = '⚡ Performance Review: ';

  if (counts.critical > 0) {
    summary += `Found ${counts.critical} critical performance issue(s). `;
  }

  summary += `Total: ${issues.length} performance issue(s): `;
  const parts = [];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${counts.low} low`);

  summary += parts.join(', ') + '. ';
  summary += `Performance score: ${score}/100.`;

  return summary;
}
