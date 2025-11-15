import { Agent } from '@mastra/core/agent';
import { OpenAITool } from '../tools/openai.js';
import { ReviewResult, Issue, FileChange } from '../types/index.js';

/**
 * 代码规范审核 Agent
 */
export function createCodeStandardsAgent(openaiApiKey: string): Agent {
  return new Agent({
    name: 'Code Standards Reviewer',
    instructions: `You are a code standards reviewer. Your role is to:
1. Check code style and formatting consistency
2. Verify naming conventions (variables, functions, classes)
3. Assess code structure and organization
4. Identify code smells and anti-patterns
5. Check for proper documentation and comments
6. Ensure adherence to language-specific best practices`,
    model: {
      provider: 'OPEN_AI',
      name: 'gpt-4-turbo-preview',
      toolChoice: 'auto',
    },
  });
}

/**
 * 执行代码规范审核
 */
export async function reviewCodeStandards(
  files: FileChange[],
  openaiApiKey: string
): Promise<ReviewResult> {
  const openaiTool = new OpenAITool(openaiApiKey);
  const issues: Issue[] = [];
  let totalScore = 100;

  const systemPrompt = `You are a code standards reviewer. Analyze the following code changes and identify:
1. Style and formatting issues
2. Naming convention violations
3. Code structure problems
4. Missing or inadequate documentation
5. Best practice violations

Return your analysis in JSON format with this structure:
{
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "type": "naming|formatting|structure|documentation|best-practice",
      "file": "filename",
      "line": line_number,
      "message": "description",
      "suggestion": "how to fix"
    }
  ],
  "summary": "overall summary",
  "score": number (0-100)
}`;
  console.log('Starting code standards review for files:');
  for (const file of files) {
    if (file.status === 'removed') continue;

    const fileContent = file.patch || '';
    if (!fileContent) continue;

    try {
      let result = await openaiTool.analyzeCode(
        systemPrompt,
        fileContent,
      );
      console.log(`code Analysis result for ${file.filename}:`);
      result = result.replace(/^```json\s*|\s*```$/gm, '');
      const {issues:issuesResult} = JSON.parse(result);
      if (issuesResult && Array.isArray(issuesResult)) {
        for (const issue of issuesResult) {
          issues.push({
            ...issue,
            file: file.filename,
          });

          const penalties = { low: 2, medium: 5, high: 10, critical: 20 };
          totalScore -= penalties[issue.severity as keyof typeof penalties] || 0;
        }
      }
    } catch (error) {
      console.error(`code Error analyzing file ${file.filename}:`, error);
    }
  }
  console.log('Total issues found:', issues.length);
  totalScore = Math.max(0, totalScore);
  const status: 'passed' | 'warning' | 'failed' =
    totalScore >= 80 ? 'passed' : totalScore >= 60 ? 'warning' : 'failed';

  return {
    agent: 'Code Standards Reviewer',
    status,
    issues,
    summary: generateSummary(issues, totalScore),
    score: totalScore,
  };
}

function generateSummary(issues: Issue[], score: number): string {
  if (issues.length === 0) {
    return '✅ No code standards issues found. Code follows best practices.';
  }

  const counts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  let summary = `Found ${issues.length} code standards issue(s): `;
  const parts = [];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${counts.low} low`);

  summary += parts.join(', ') + '. ';
  summary += `Code quality score: ${score}/100.`;

  return summary;
}
