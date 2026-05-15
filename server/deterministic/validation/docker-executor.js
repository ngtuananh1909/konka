const RUNNER_URL = (process.env.RUNNER_API_BASE_URL || 'http://127.0.0.1:8788').replace(/\/$/, '');
const RUNNER_SECRET = process.env.RUNNER_SHARED_SECRET || '';

function normalizeText(value) {
  return String(value == null ? '' : value).replace(/\r/g, '').trim();
}

function mapRunnerVerdict(verdict) {
  if (verdict === 'accepted') return { success: true, reason: 'passed' };
  if (verdict === 'timeout') return { success: false, reason: 'timeout' };
  if (verdict === 'runtime_error') return { success: false, reason: 'runtime_error' };
  if (verdict === 'compile_error') return { success: false, reason: 'compile_error' };
  return { success: false, reason: 'wrong_answer' };
}

async function callRunner({ code, tests, mode }) {
  const headers = { 'Content-Type': 'application/json' };
  if (RUNNER_SECRET) headers['x-runner-secret'] = RUNNER_SECRET;
  const response = await fetch(RUNNER_URL + '/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify({ language: 'python', mode, code, tests })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error('Runner HTTP ' + response.status + ': ' + body);
  }
  return response.json();
}

async function executeInDocker({ fileId, file, language, tests, mode }) {
  const content = file && file.content || '';
  if (!content.trim()) {
    return {
      fileId,
      success: false,
      output: '',
      stderr: 'Empty file',
      reason: 'compile_error',
      language,
      verdict: 'compile_error',
      cases: []
    };
  }

  if (language && language !== 'python') {
    return {
      fileId,
      success: false,
      output: '',
      stderr: 'Only python is supported in v1',
      reason: 'unsupported_language',
      language,
      verdict: 'compile_error',
      cases: []
    };
  }

  try {
    const execution = await callRunner({ code: content, tests: tests || [], mode: mode || 'hidden' });
    const mapped = mapRunnerVerdict(execution.verdict);
    const failedCase = (execution.cases || []).find(current => !current.passed);
    return {
      fileId,
      success: mapped.success,
      output: normalizeText((execution.cases || []).map(current => current.stdout).filter(Boolean).join('\n')),
      stderr: normalizeText((failedCase && failedCase.stderr) || ''),
      reason: mapped.reason,
      language: language || 'python',
      verdict: execution.verdict,
      cases: execution.cases || [],
      passed: Number(execution.passed || 0),
      total: Number(execution.total || 0),
      executor: 'docker-runner'
    };
  } catch (error) {
    return {
      fileId,
      success: false,
      output: '',
      stderr: error.message,
      reason: 'runner_unavailable',
      language: language || 'python',
      verdict: 'runtime_error',
      cases: []
    };
  }
}

module.exports = {
  executeInDocker
};
