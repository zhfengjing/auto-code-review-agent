/**
 * 测试工作流 retry 机制
 * 这个脚本会临时修改一个 step 使其在前几次调用时抛出错误
 */
import { createCodeReviewWorkflow } from './src/workflows/code-review-workflow.js';

// 临时修改环境变量来测试重试
const testRetry = async () => {
  console.log('=== 开始测试 Retry 机制 ===\n');

  const workflow = createCodeReviewWorkflow();

  try {
    const run = await workflow.createRunAsync({
      runId: 'test-retry-run',
    });

    console.log('工作流已创建，准备执行...\n');

    // 使用无效的 API key 来触发错误
    const result = await run.start({
      inputData: {
        owner: 'test-owner',
        repo: 'test-repo',
        commitSha: 'test-sha',
        branch: 'test-branch',
        githubToken: 'invalid-token', // 无效 token
        openaiApiKey: 'invalid-key', // 无效 API key，会导致失败
      },
    });

    console.log('\n=== 执行结果 ===');
    console.log(result);
  } catch (error) {
    console.log('\n=== 捕获到错误（预期行为）===');
    console.log('错误信息:', error instanceof Error ? error.message : error);
    console.log('\n检查上面的日志，应该能看到多次 "Attempt: X" 的输出');
  }
};

testRetry();
