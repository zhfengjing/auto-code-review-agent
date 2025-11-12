import OpenAI from 'openai';

/**
 * OpenAI 工具类 - 用于与 OpenAI API 交互
 */
export class OpenAITool {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * 通用的代码分析方法
   */
  async analyzeCode(
    systemPrompt: string,
    codeContent: string,
    additionalContext?: string
  ): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `${additionalContext ? additionalContext + '\n\n' : ''}Code to analyze:\n\n${codeContent}`,
      },
    ];

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * 结构化的代码分析，返回 JSON 格式
   */
  async analyzeCodeStructured(
    systemPrompt: string,
    codeContent: string,
    responseFormat: any
  ): Promise<any> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Code to analyze:\n\n${codeContent}\n\nPlease respond in JSON format.`,
      },
    ];

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * 批量分析多个文件
   */
  async analyzeMultipleFiles(
    systemPrompt: string,
    files: Array<{ filename: string; content: string }>
  ): Promise<string> {
    const filesContent = files
      .map((file) => `File: ${file.filename}\n\`\`\`\n${file.content}\n\`\`\``)
      .join('\n\n');

    return this.analyzeCode(systemPrompt, filesContent);
  }
}
