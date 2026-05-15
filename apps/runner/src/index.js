const express = require('express');
const { spawn } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const crypto = require('node:crypto');

const app = express();
app.use(express.json({ limit: '1mb' }));

const RUNNER_HOST = process.env.RUNNER_HOST || '0.0.0.0';
const RUNNER_PORT = Number(process.env.RUNNER_PORT || 8788);
const RUNNER_SHARED_SECRET = process.env.RUNNER_SHARED_SECRET || '';
const PYTHON_WORKER_CONTAINER = process.env.PYTHON_WORKER_CONTAINER || 'konka-python-worker';
const EXEC_TIMEOUT_MS = Number(process.env.RUNNER_EXEC_TIMEOUT_MS || 3000);

function verifySecret(req, res, next) {
  if (!RUNNER_SHARED_SECRET) return next();
  const header = String(req.headers['x-runner-secret'] || '');
  if (!header || header !== RUNNER_SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function normalizeOutput(value) {
  return String(value == null ? '' : value).replace(/\r/g, '').trim();
}

function deepEqualExpected(actual, expected) {
  if (typeof expected === 'number') {
    const n = Number(actual);
    if (!Number.isNaN(n)) return Math.abs(n - expected) < 1e-9;
  }
  return stableStringify(actual) === stableStringify(expected);
}

function parseCaseOutput(rawStdout) {
  const text = normalizeOutput(rawStdout);
  if (!text) return { parsed: undefined, raw: '' };
  try {
    return { parsed: JSON.parse(text), raw: text };
  } catch {
    return { parsed: text, raw: text };
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, EXEC_TIMEOUT_MS);

    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, stdout, stderr });
    });
  });
}

function buildHarnessSource(userCode, testCase) {
  const setup = String(testCase.setup || '');
  const expression = String(testCase.expression || 'None');
  return [
    userCode || '',
    '',
    'import json as __konka_json',
    'def __konka_to_json(value):',
    '    try:',
    '        return __konka_json.dumps(value)',
    '    except Exception:',
    '        return __konka_json.dumps(str(value))',
    '',
    setup,
    '__konka_result = (' + expression + ')',
    'print(__konka_to_json(__konka_result))'
  ].join('\n');
}

async function runPythonCase(code, testCase) {
  const dir = await mkdtemp(join(tmpdir(), 'konka-run-'));
  const sourcePath = join(dir, 'main.py');
  const source = buildHarnessSource(code, testCase);
  try {
    await writeFile(sourcePath, source, 'utf8');
    const execResult = await runCommand('docker', [
      'exec',
      '-i',
      PYTHON_WORKER_CONTAINER,
      'python',
      sourcePath
    ]);

    if (execResult.timedOut) {
      return {
        verdict: 'timeout',
        passed: false,
        stdout: normalizeOutput(execResult.stdout),
        stderr: normalizeOutput(execResult.stderr) || 'Execution timed out'
      };
    }

    if (execResult.code !== 0) {
      return {
        verdict: 'runtime_error',
        passed: false,
        stdout: normalizeOutput(execResult.stdout),
        stderr: normalizeOutput(execResult.stderr) || `Exited with code ${execResult.code}`
      };
    }

    const parsed = parseCaseOutput(execResult.stdout);
    const passed = deepEqualExpected(parsed.parsed, testCase.expected);
    return {
      verdict: passed ? 'accepted' : 'wrong_answer',
      passed,
      stdout: parsed.raw,
      stderr: normalizeOutput(execResult.stderr),
      actual: parsed.parsed,
      expected: testCase.expected
    };
  } catch (error) {
    return {
      verdict: 'runtime_error',
      passed: false,
      stdout: '',
      stderr: error.message
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function executePythonSubmission(payload) {
  const tests = payload.tests || [];
  const caseResults = [];
  for (let i = 0; i < tests.length; i += 1) {
    const current = tests[i];
    const result = await runPythonCase(payload.code || '', current);
    caseResults.push({
      index: i,
      name: current.name || `case-${i + 1}`,
      verdict: result.verdict,
      passed: result.passed,
      stdout: result.stdout,
      stderr: result.stderr,
      expected: current.expected,
      actual: Object.prototype.hasOwnProperty.call(result, 'actual') ? result.actual : undefined
    });
    if (!result.passed) break;
  }

  const passed = caseResults.filter(item => item.passed).length;
  const total = tests.length;
  const finalVerdict = passed === total
    ? 'accepted'
    : (caseResults.find(item => !item.passed) || {}).verdict || 'wrong_answer';

  return {
    verdict: finalVerdict,
    passed,
    total,
    cases: caseResults,
    language: 'python'
  };
}

app.get('/health', async (_req, res) => {
  const ping = await runCommand('docker', ['ps', '--format', '{{.Names}}']);
  const containers = String(ping.stdout || '').split('\n').map(line => line.trim()).filter(Boolean);
  const workerReady = containers.includes(PYTHON_WORKER_CONTAINER);
  res.json({
    ok: true,
    mode: 'docker-runner',
    worker: PYTHON_WORKER_CONTAINER,
    workerReady
  });
});

app.post('/execute', verifySecret, async (req, res) => {
  const body = req.body || {};
  if (body.language !== 'python') {
    return res.status(400).json({ error: 'Only python is supported in v1' });
  }
  if (!Array.isArray(body.tests) || body.tests.length === 0) {
    return res.status(400).json({ error: 'tests are required' });
  }

  const startedAt = Date.now();
  const execution = await executePythonSubmission(body);
  return res.json({
    ...execution,
    runtimeMs: Date.now() - startedAt,
    requestId: crypto.randomUUID()
  });
});

app.listen(RUNNER_PORT, RUNNER_HOST, () => {
  console.log(`Runner listening on http://${RUNNER_HOST}:${RUNNER_PORT}`);
});
