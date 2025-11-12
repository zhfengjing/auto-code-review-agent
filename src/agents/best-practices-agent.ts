import {Agent} from '@mastra/core/agent';
import { OpenAITool } from '../tools/openai.js';
import { ReviewResult, Issue } from '../types/index.js';
// import { openai } from '@ai-sdk/openai';
/**
 * 最佳实践 Agent
 * 负责检查代码是否遵循行业最佳实践
 */
export class BestPracticesAgent {
  private agent: Agent;
  private openaiTool: OpenAITool;

  constructor(openaiTool: OpenAITool) {
    this.openaiTool = openaiTool;
    
    this.agent = new Agent({
      name: 'Best Practices Reviewer',
      description: 'Reviews code for adherence to industry best practices',
      instructions: `You are a best practices expert. Analyze the provided code and check for:
1. Error handling (try-catch, error boundaries)
2. Proper use of design patterns
3. SOLID principles adherence
4. Separation of concerns
5. Testability of code
6. Proper dependency management
7. Configuration management (environment variables)
8. Logging and monitoring practices
9. Code reusability
10. API design (RESTful, GraphQL best practices)
11. State management patterns
12. Proper use of TypeScript types

Provide recommendations based on modern development practices.`,
      // model: openai('gpt-4o-mini'),
      // tools: { openaiTool: this.openaiTool },
    });
  }

  async review(files: Array<{ filename: string; content: string; patch?: string }>): Promise<ReviewResult> {
    const systemPrompt = `You are a best practices expert. Analyze code for adherence to best practices.
Return a JSON object with this structure:
{
  "issues": [
    {
      "severity": "low|medium|high|critical",
      "type": "error-handling|design-pattern|solid|separation|testing|other",
      "file": "filename",
      "line": 10,
      "message": "description of best practice violation",
      "suggestion": "recommended approach"
    }
  ],
  "summary": "brief best practices assessment",
  "score": 80
}

Focus on practices that improve code maintainability, reliability, and team collaboration.`;

    try {
      const codeContent = files
        .map((f) => `File: ${f.filename}\n\n${f.content}\n${f.patch ? '\nPatch:\n' + f.patch : ''}\n---`)
        .join('\n');

      const result = await this.openaiTool.analyzeCodeStructured(systemPrompt, codeContent);

      const issues: Issue[] = result.issues || [];
      const score = result.score || 75;

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      const criticalCount = issues.filter((i) => i.severity === 'critical').length;
      const highCount = issues.filter((i) => i.severity === 'high').length;

      if (criticalCount > 0 || score < 50) {
        status = 'failed';
      } else if (highCount > 3 || score < 70) {
        status = 'warning';
      }

      return {
        agent: 'Best Practices',
        status,
        issues,
        summary: result.summary || 'Best practices review completed.',
        score,
      };
    } catch (error) {
      console.error('Best Practices Agent error:', error);
      return {
        agent: 'Best Practices',
        status: 'warning',
        issues: [
          {
            severity: 'medium',
            type: 'error',
            message: `Best practices analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        summary: 'Failed to complete best practices review.',
        score: 50,
      };
    }
  }
}
