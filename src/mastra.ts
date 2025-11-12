import { Mastra } from '@mastra/core';
import { createAllAgents } from './agents/index.js';
import { tools } from './tools/index.js';
import { createCodeReviewWorkflow } from './workflows/code-review-workflow.js';
import { Env } from './types/index.js';

/**
 * 创建 Mastra 实例
 */
export function createMastraInstance(env: Env): Mastra {
  const agents = createAllAgents(env.OPENAI_API_KEY);

  const mastra = new Mastra({
    agents: agents,
    legacy_workflows: {
      codeReview: createCodeReviewWorkflow(),
    },
    telemetry: {
      enabled: false,
    },
  });

  return mastra;
}

/**
 * 获取或创建 Mastra 单例
 */
let mastraInstance: Mastra | null = null;

export function getMastraInstance(env: Env): Mastra {
  if (!mastraInstance) {
    mastraInstance = createMastraInstance(env);
  }
  return mastraInstance;
}
