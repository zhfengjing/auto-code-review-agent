/**
 * 受控的 Retry 测试
 * 创建一个简单的工作流，前 2 次调用失败，第 3 次成功
 */
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

let attemptCounter = 0;

const testStep = createStep({
  id: 'test-retry-step',
  description: 'Test step that fails first 2 times',
  inputSchema: z.object({
    testValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  retries: 3,
  execute: async ({ inputData, runCount }) => {
    attemptCounter++;
    console.log(`\n[Test] Attempt ${runCount + 1} (Global counter: ${attemptCounter})`);
    console.log(`[Test] Input:`, inputData);

    // 前 2 次失败，第 3 次成功
    if (runCount < 2) {
      console.log(`[Test] ❌ Throwing error to trigger retry...`);
      throw new Error(`Simulated failure on attempt ${runCount + 1}`);
    }

    console.log(`[Test] ✅ Success on attempt ${runCount + 1}`);
    return {
      result: `Success after ${runCount + 1} attempts`,
    };
  },
});

const testWorkflow = createWorkflow({
  id: 'test-retry-workflow',
  inputSchema: z.object({
    testValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  retryConfig: { attempts: 3, delay: 1000 }, // 工作流级别的重试配置
})
  .then(testStep)
  .commit();

// 运行测试
const runTest = async () => {
  console.log('=== 测试 Step 级别的 Retry 机制 ===');
  console.log('期望结果: 前 2 次失败，第 3 次成功\n');

  try {
    const run = await testWorkflow.createRunAsync({
      runId: 'controlled-retry-test',
    });

    const result = await run.start({
      inputData: {
        testValue: 'test-data',
      },
    });

    console.log('\n=== 最终结果 ===');
    console.log('成功！结果:', result);
    console.log(`总尝试次数: ${attemptCounter}`);

    if (attemptCounter === 3) {
      console.log('\n✅ Retry 机制工作正常！');
    } else {
      console.log('\n⚠️  Retry 可能未按预期工作');
    }
  } catch (error) {
    console.log('\n=== 测试失败 ===');
    console.log('错误:', error instanceof Error ? error.message : error);
    console.log(`总尝试次数: ${attemptCounter}`);
    console.log('\n如果尝试次数大于 1，说明 retry 机制有效');
  }
};

runTest();
