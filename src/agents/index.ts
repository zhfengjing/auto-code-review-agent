import { createCodeStandardsAgent, reviewCodeStandards } from './code-standards-agent.js';
import { createSecurityAgent, reviewSecurity } from './security-agent.js';
import { createPerformanceAgent, reviewPerformance } from './performance-agent.js';

/**
 * 导出所有 Agents
 */
export {
  createCodeStandardsAgent,
  reviewCodeStandards,
  createSecurityAgent,
  reviewSecurity,
  createPerformanceAgent,
  reviewPerformance,
};

/**
 * 创建所有审核 Agents
 */
export function createAllAgents(openaiApiKey: string) {
  return {
    codeStandards: createCodeStandardsAgent(openaiApiKey),
    security: createSecurityAgent(openaiApiKey),
    performance: createPerformanceAgent(openaiApiKey),
  };
}
