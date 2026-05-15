const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const { URL } = require('url');
const { getProblemForFile } = require('./problems/python-problems');
const { executeInDocker } = require('./deterministic/validation/docker-executor');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Optional cors package support if installed
try {
  const cors = require('cors');
  app.use(cors());
} catch (e) {}
const host = process.env.REVIEW_SERVER_HOST || '127.0.0.1';
const port = Number(process.env.REVIEW_SERVER_PORT || 8787);

// Provider configuration: 'google' (default) or 'openrouter'
const REVIEW_PROVIDER = (process.env.REVIEW_PROVIDER || 'google').toLowerCase();
const REVIEW_PROVIDER_API_KEY = process.env.REVIEW_PROVIDER_API_KEY || process.env.GEMINI_API_KEY || '';
const REVIEW_PROVIDER_MODEL = process.env.REVIEW_PROVIDER_MODEL || 'mistral-1';
const REVIEW_PROVIDER_URL = process.env.REVIEW_PROVIDER_URL || 'https://api.openrouter.ai/v1/chat/completions';

let googleClient = null;
if (REVIEW_PROVIDER === 'google') {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    googleClient = REVIEW_PROVIDER_API_KEY ? new GoogleGenerativeAI(REVIEW_PROVIDER_API_KEY) : null;
  } catch (e) {
    googleClient = null;
  }
}

async function generateWithOpenRouter(model, prompt, opts = {}) {
  // Uses the OpenRouter chat completions endpoint.
  // Keep messages simple: single user message with concise prompt to reduce tokens.
  const body = {
    model: model,
    messages: [
      { role: 'user', content: prompt }
    ],
    // token controls
    max_tokens: opts.max_tokens || 512,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.0,
    stream: false
  };

  const url = REVIEW_PROVIDER_URL;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${REVIEW_PROVIDER_API_KEY}`
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  // Support both chat-style or completion-style responses
  const content = (data.choices && data.choices[0] && (data.choices[0].message && data.choices[0].message.content || data.choices[0].text)) || '';
  return String(content || '').trim();
}

function formatProviderError(error) {
  const parts = [error && error.message ? error.message : 'Unknown error'];
  const cause = error && error.cause;
  if (cause && cause.code) parts.push(`code=${cause.code}`);
  if (cause && cause.errno !== undefined) parts.push(`errno=${cause.errno}`);
  if (cause && cause.syscall) parts.push(`syscall=${cause.syscall}`);
  if (cause && cause.hostname) parts.push(`hostname=${cause.hostname}`);
  return parts.join(' ');
}

async function probeProvider() {
  if (REVIEW_PROVIDER === 'openrouter') {
    if (!REVIEW_PROVIDER_API_KEY) {
      return {
        ok: false,
        provider: REVIEW_PROVIDER,
        model: REVIEW_PROVIDER_MODEL,
        url: REVIEW_PROVIDER_URL,
        error: 'Missing provider API key'
      };
    }
    try {
      await generateWithOpenRouter(REVIEW_PROVIDER_MODEL, 'Reply with OK.', { max_tokens: 5, temperature: 0.0 });
      return {
        ok: true,
        provider: REVIEW_PROVIDER,
        model: REVIEW_PROVIDER_MODEL,
        url: REVIEW_PROVIDER_URL
      };
    } catch (error) {
      return {
        ok: false,
        provider: REVIEW_PROVIDER,
        model: REVIEW_PROVIDER_MODEL,
        url: REVIEW_PROVIDER_URL,
        error: formatProviderError(error)
      };
    }
  }

  if (REVIEW_PROVIDER === 'google') {
    return {
      ok: !!googleClient,
      provider: REVIEW_PROVIDER,
      model: REVIEW_PROVIDER_MODEL,
      error: googleClient ? '' : 'Google client not configured'
    };
  }

  return {
    ok: false,
    provider: REVIEW_PROVIDER,
    model: REVIEW_PROVIDER_MODEL,
    error: 'Unknown provider'
  };
}

function buildDeterministicFallback(snapshot) {
  const currentFile = snapshot && snapshot.currentFile;
  const results = snapshot && snapshot.results || {};
  const currentResult = results[currentFile] || {};
  const completedQuests = Number(currentResult.devPassed || 0);
  const totalQuests = Number(currentResult.devTotal || 0);
  const files = Object.fromEntries(Object.keys(results).map(fileId => {
    const result = results[fileId] || {};
    const fileDone = Number(result.devTotal || 0) > 0 && Number(result.devPassed || 0) === Number(result.devTotal || 0) && !result.corrupted;
    return [fileId, {
      fileId,
      done: fileDone,
      completedQuests: Number(result.devPassed || 0),
      totalQuests: Number(result.devTotal || 0),
      status: result.status || 'failed',
      explanation: 'Fallback from host deterministic validation.',
      corrupted: !!result.corrupted,
      source: 'fallback'
    }];
  }));
  return {
    fileId: currentFile,
    done: totalQuests > 0 && completedQuests === totalQuests && !currentResult.corrupted,
    completedQuests,
    totalQuests,
    status: currentResult.status || 'failed',
    explanation: 'Fallback from host deterministic validation.',
    currentReview: {
      fileId: currentFile,
      done: totalQuests > 0 && completedQuests === totalQuests && !currentResult.corrupted,
      completedQuests,
      totalQuests,
      status: currentResult.status || 'failed',
      explanation: 'Fallback from host deterministic validation.',
      source: 'fallback'
    },
    files,
    source: 'fallback'
  };
}

function normalizeReviewStatus(status, fallbackStatus, runnable, satisfiesQuest) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'normal' || normalized === 'pass' || normalized === 'passed' || normalized === 'ok') return 'normal';
  if (normalized === 'injected' || normalized === 'broken' || normalized === 'fail' || normalized === 'failed' || normalized === 'sabotaged') return 'injected';
  if (typeof runnable === 'boolean' || typeof satisfiesQuest === 'boolean') {
    return runnable && satisfiesQuest ? 'normal' : 'injected';
  }
  if (fallbackStatus === 'ok' || fallbackStatus === 'pass') return 'normal';
  if (fallbackStatus === 'sabotaged') return 'injected';
  return fallbackStatus || 'injected';
}

function normalizeReviewedFile(fileId, parsedFile, fallbackFile, source) {
  const runnable = typeof parsedFile.runnable === 'boolean' ? parsedFile.runnable : !fallbackFile.corrupted && fallbackFile.status === 'ok';
  const satisfiesQuest = typeof parsedFile.satisfiesQuest === 'boolean' ? parsedFile.satisfiesQuest : fallbackFile.done;
  const status = normalizeReviewStatus(parsedFile.status, fallbackFile.status, runnable, satisfiesQuest);
  const done = typeof parsedFile.done === 'boolean' ? parsedFile.done : status === 'normal';
  const completedQuests = Number.isFinite(parsedFile.completedQuests) ? parsedFile.completedQuests : fallbackFile.completedQuests;
  const totalQuests = Number.isFinite(parsedFile.totalQuests) ? parsedFile.totalQuests : fallbackFile.totalQuests;
  const explanation = parsedFile.reason || parsedFile.explanation || fallbackFile.explanation || '';
  const corrupted = typeof parsedFile.corrupted === 'boolean' ? parsedFile.corrupted : status === 'injected';
  const normalized = {
    ...fallbackFile,
    ...parsedFile,
    fileId,
    done,
    completedQuests,
    totalQuests,
    status,
    explanation,
    runnable,
    satisfiesQuest,
    corrupted,
    source: parsedFile.source || source || fallbackFile.source || 'fallback'
  };
  if (parsedFile.reason && !parsedFile.explanation) normalized.reason = parsedFile.reason;
  return normalized;
}

function normalizeRoomReview(parsed, fallback) {
  const fallbackFiles = fallback.files || {};
  const parsedFiles = parsed && parsed.files || {};
  const source = parsed.source || fallback.source || 'fallback';
  const files = Object.fromEntries(Object.keys({ ...fallbackFiles, ...parsedFiles }).map(fileId => {
    const fallbackFile = fallbackFiles[fileId] || { fileId, done: false, completedQuests: 0, totalQuests: 0, status: 'failed', explanation: '', corrupted: false, source: fallback.source || 'fallback' };
    const parsedFile = parsedFiles[fileId] || {};
    return [fileId, normalizeReviewedFile(fileId, parsedFile, fallbackFile, source)];
  }));
  const currentReview = parsed && parsed.currentReview || {};
  const fallbackCurrent = fallback.currentReview || {};
  const currentReviewFileId = currentReview.fileId || parsed.fileId || fallbackCurrent.fileId;
  const currentReviewFallback = files[currentReviewFileId] || fallbackCurrent;
  const normalizedCurrent = normalizeReviewedFile(currentReviewFileId, currentReview, currentReviewFallback, currentReview.source || source);
  return {
    fileId: parsed.fileId || normalizedCurrent.fileId || fallback.fileId,
    done: typeof parsed.done === 'boolean' ? parsed.done : normalizedCurrent.done,
    completedQuests: Number.isFinite(parsed.completedQuests) ? parsed.completedQuests : normalizedCurrent.completedQuests,
    totalQuests: Number.isFinite(parsed.totalQuests) ? parsed.totalQuests : normalizedCurrent.totalQuests,
    status: normalizeReviewStatus(parsed.status, normalizedCurrent.status, normalizedCurrent.runnable, normalizedCurrent.satisfiesQuest),
    explanation: parsed.reason || parsed.explanation || normalizedCurrent.explanation || '',
    currentReview: normalizedCurrent,
    files,
    source
  };
}

function buildRoomReviewPrompt(snapshot) {
  return [
    'You are reviewing every file in a multiplayer coding quest room.',
    'Return JSON only.',
    'Top-level keys: fileId, status, explanation, currentReview, files, source.',
    'For each file in files, return: fileId, status, runnable, satisfiesQuest, reason, confidence.',
    'Status must be exactly normal or injected.',
    'A file is normal only when it appears runnable or compilable for its language and satisfies its assigned developer quest requirements.',
    'If the code appears broken, sabotaged, syntactically invalid, missing required behavior, or inconsistent with the quest, mark it injected.',
    'Judge from the provided source code and quest context only; do not claim to have actually executed the code.',
    'Keep reason brief and concrete.',
    'currentReview must summarize the currently selected file using the same shape.',
    JSON.stringify({
      currentFile: snapshot.currentFile,
      files: snapshot.files || {},
      currentReviewTarget: snapshot.currentReviewTarget || {},
      developerTasks: snapshot.developerTasks || {},
      injectorTasks: snapshot.injectorTasks || {},
      taskValidation: snapshot.taskValidation || {},
      players: snapshot.players || [],
      round: snapshot.round || 0
    })
  ].join('\n\n');
}

app.get('/health', (_req, res) => {
  const ok = REVIEW_PROVIDER === 'google' ? !!googleClient : !!REVIEW_PROVIDER_API_KEY;
  res.json({ ok: true, provider: REVIEW_PROVIDER, configured: ok });
});

app.get('/health/provider', async (_req, res) => {
  const result = await probeProvider();
  return res.status(result.ok ? 200 : 503).json(result);
});

app.post('/api/review-meeting', async (req, res) => {
  const snapshot = req.body || {};
  if (!snapshot.currentFile || !snapshot.results) {
    return res.status(400).json({ error: 'currentFile and results are required' });
  }

  const fallback = buildDeterministicFallback(snapshot);
  if (REVIEW_PROVIDER === 'google' && !googleClient) return res.json(fallback);
  if (REVIEW_PROVIDER === 'openrouter' && !REVIEW_PROVIDER_API_KEY) return res.json(fallback);

  try {
    const prompt = buildRoomReviewPrompt(snapshot);

    // Use provider-specific generation
    let text = '';
    if (REVIEW_PROVIDER === 'openrouter') {
      // OpenRouter chat completion (concise prompt + token limits to optimize cost)
      const maxTokens = Number(process.env.REVIEW_PROVIDER_MAX_TOKENS || 512);
      text = await generateWithOpenRouter(REVIEW_PROVIDER_MODEL, prompt, { max_tokens: maxTokens });
    } else if (REVIEW_PROVIDER === 'google' && googleClient) {
      const model = googleClient.getGenerativeModel({ model: REVIEW_PROVIDER_MODEL || 'gemini-2.5-pro' });
      const response = await model.generateContent(prompt);
      text = response.response.text().trim();
    } else {
      // No provider configured; fallback to deterministic
      throw new Error('No LLM provider configured or available');
    }
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeRoomReview({ ...parsed, source: REVIEW_PROVIDER }, fallback);
    return res.json(normalized);
  } catch (error) {
    return res.json({
      ...fallback,
      explanation: REVIEW_PROVIDER + ' request failed: ' + formatProviderError(error),
      source: 'fallback'
    });
  }
});

app.listen(port, host, () => {
  console.log(`Review server listening on http://${host}:${port}`);
});
