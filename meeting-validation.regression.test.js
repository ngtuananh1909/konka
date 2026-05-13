const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadReviewServerContext(overrides = {}) {
  const source = fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/server/review-server.js', 'utf8');
  const routes = {};
  const app = {
    use: () => {},
    get: (path, handler) => { routes[`GET ${path}`] = handler; },
    post: (path, handler) => { routes[`POST ${path}`] = handler; },
    listen: () => {},
  };
  const express = () => app;
  express.json = () => () => {};
  const requireMap = {
    express,
    dotenv: { config: () => {} },
    url: { URL },
    cors: () => () => {},
    '@google/generative-ai': {
      GoogleGenerativeAI: function FakeGoogleGenerativeAI() {
        return { getGenerativeModel: () => ({ generateContent: async () => ({ response: { text: () => '' } }) }) };
      }
    }
  };
  const env = {
    REVIEW_PROVIDER: 'openrouter',
    REVIEW_PROVIDER_API_KEY: 'test-key',
    REVIEW_PROVIDER_MODEL: 'mistral-1',
    REVIEW_PROVIDER_URL: 'https://openrouter.invalid/v1/chat/completions',
    REVIEW_SERVER_HOST: '127.0.0.1',
    REVIEW_SERVER_PORT: '8787',
    ...overrides.env,
  };
  const context = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }),
    process: { env },
    require: (name) => {
      if (requireMap[name]) return requireMap[name];
      throw new Error('Unexpected require: ' + name);
    },
    module: { exports: {} },
    exports: {},
    __routes: routes,
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function loadExecuteUiContext(overrides = {}) {
  const source = fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance: { now: () => 0 },
    requestAnimationFrame: (cb) => { cb(); return 1; },
    cancelAnimationFrame: () => {},
    document: { getElementById: () => null },
    window: { location: { href: 'http://localhost:8081/', search: '', hash: '' }, history: { replaceState: () => {} } },
    history: { replaceState: () => {} },
    location: { href: 'http://localhost:8081/', search: '', hash: '' },
    URL,
    URLSearchParams,
    render: () => {},
    updateExecutionUI: () => {},
    updateSpecificExecutionUI: () => {},
    scheduleValidationRender: () => {},
    sendToAll: () => {},
    patchProgressBar: () => {},
    patchTaskList: () => {},
    clonePlain: (value) => JSON.parse(JSON.stringify(value || {})),
    collectLocalCodeSnapshot: () => ({}),
    exportGameState: () => ({}),
    holdFinalValidationScreen: () => {},
    buildValidationShell: (status) => ({ status, files: {}, globalProgress: 0, sabotageProgress: 0 }),
    cssEscapeId: (value) => String(value),
    writeExecutionLog: () => {},
    recalculateGlobalProgress: () => {},
    setTaskValidationStatus: () => {},
    verifyFileIntegrity: () => ({ corrupted: false, lines: [] }),
    fetchPiston: async () => ({ stdout: '', stderr: '', success: true }),
    cleanValidationText: (value) => String(value == null ? '' : value).trim().replaceAll('\r', ''),
    validateTaskStrict: () => false,
    getTaskExpectedOutput: () => '',
    notify: () => {},
    FILES: {
      'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
    },
    TASKS_DEVELOPER: {
      'main.game.js': [
        { id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' },
      ],
    },
    TASKS_INJECTOR: {
      'main.game.js': [],
    },
    S: {
      gameState: {
        files: {
          'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
        },
        taskValidation: {},
        globalProgress: 0,
        sabotageProgress: 0,
      },
      hostCodeSubmissions: {},
      players: [{ peerId: 'host', isHost: true }],
      injectorPeerIds: [],
      tasks: {},
      reviewApiBaseUrl: 'http://localhost:8787',
      geminiReviewEnabled: false,
      geminiReviewError: '',
    },
    ...overrides,
  };

  if (overrides.S) {
    context.S = {
      ...context.S,
      ...overrides.S,
      gameState: {
        ...context.S.gameState,
        ...((overrides.S && overrides.S.gameState) || {}),
      },
    };
  }

  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function loadNetworkContext(overrides = {}) {
  const source = fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/network.js', 'utf8');
  const state = {
    peer: { destroyed: false, connect: () => ({ on: () => {}, open: true, peer: 'host-room', send: () => {} }) },
    peerId: 'self-peer',
    peerStatus: 'ready',
    connections: {},
    phase: 'lobby',
    roomId: null,
    roomName: '',
    maxPlayers: 5,
    players: [],
    myName: 'Player',
    myColor: '#22c55e',
    myAvatar: '👾',
    notification: null,
  };
  const customConnectToPeer = overrides.connectToPeer;
  const runtimeOverrides = { ...overrides };
  delete runtimeOverrides.connectToPeer;
  const location = overrides.location || { href: 'http://localhost:8081/', search: '', hash: '' };
  const historyCalls = [];
  const history = overrides.history || {
    replaceState: (_state, _title, nextUrl) => {
      historyCalls.push(nextUrl);
      if (typeof nextUrl === 'string') {
        const parsed = new URL(nextUrl, location.href);
        location.href = parsed.href;
        location.search = parsed.search;
        location.hash = parsed.hash;
      }
    }
  };
  const windowObj = overrides.window || { location, history };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance: { now: () => 0 },
    requestAnimationFrame: (cb) => { cb(); return 1; },
    cancelAnimationFrame: () => {},
    URL,
    URLSearchParams,
    window: windowObj,
    history,
    location,
    document: { getElementById: () => null },
    render: () => {},
    dbg: () => {},
    notify: () => {},
    addChatMessage: () => {},
    removePlayerCursor: () => {},
    summarizeCurrentFileReview: () => ({ fileId: 'main.game.js' }),
    patchProgressBar: () => {},
    patchTaskList: () => {},
    updateExecutionUI: () => {},
    scheduleNetworkRender: () => {},
    finishExecuteScreenFromHost: () => {},
    clonePlain: (value) => JSON.parse(JSON.stringify(value || {})),
    exportGameState: () => ({}),
    hydrateGameState: () => {},
    applyRoles: () => {},
    startCountdown: () => {},
    applyTextPatch: (_old, patch) => patch && patch.nextContent || '',
    recordVoteAction: () => {},
    handleMeetingVoteCast: () => {},
    handleMeetingStart: () => {},
    handleMeetingCancel: () => {},
    handleRemoteTaskUncompleted: () => {},
    processVoteResult: () => {},
    handlePlayerEliminated: () => {},
    recalculateGlobalProgress: () => {},
    updateNetworkStatus: () => {},
    Peer: function FakePeer() { return { on: () => {}, destroyed: false, reconnect: () => {}, connect: () => ({ on: () => {}, open: true, peer: 'host-room', send: () => {} }) }; },
    FILES: {},
    S: { ...state, ...(runtimeOverrides.S || {}) },
    ...runtimeOverrides,
  };

  if (customConnectToPeer) context.connectToPeer = customConnectToPeer;

  if (runtimeOverrides.S) {
    context.S = {
      ...context.S,
      ...runtimeOverrides.S,
    };
  }

  if (!context.S.peer) context.S.peer = state.peer;

  vm.createContext(context);
  vm.runInContext(source, context);
  if (customConnectToPeer) context.connectToPeer = customConnectToPeer;
  context.__historyCalls = historyCalls;
  return context;
}

test('meeting validation includes unfinished tasks even when none are pending_validation', () => {
  const context = loadExecuteUiContext();

  const pending = context.getPendingTasksForFile('main.game.js');

  assert.equal(
    pending.tasks.length,
    1,
    'meeting validation should still pick unfinished quests from the current file even before manual run marks them pending_validation'
  );
});

test('meeting review summary marks current file as not done when not all developer quests pass', () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';

  const summary = context.summarizeCurrentFileReview({
    'main.game.js': {
      fileId: 'main.game.js',
      status: 'failed',
      devPassed: 1,
      devTotal: 4,
      corrupted: false,
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(summary)), {
    fileId: 'main.game.js',
    done: false,
    completedQuests: 1,
    totalQuests: 4,
    status: 'failed',
    explanation: '',
    source: 'host_validation',
  });
});

test('meeting review summary marks current file as done when all developer quests pass and file is not sabotaged', () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';

  const summary = context.summarizeCurrentFileReview({
    'main.game.js': {
      fileId: 'main.game.js',
      status: 'ok',
      devPassed: 4,
      devTotal: 4,
      corrupted: false,
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(summary)), {
    fileId: 'main.game.js',
    done: true,
    completedQuests: 4,
    totalQuests: 4,
    status: 'ok',
    explanation: '',
    source: 'host_validation',
  });
});

test('review server normalizes OpenRouter JSON into normal and injected file verdicts', () => {
  const openRouterReply = {
    currentReview: {
      fileId: 'main.game.js',
      status: 'normal',
      runnable: true,
      satisfiesQuest: true,
      reason: 'Looks runnable and satisfies the quest.',
      confidence: 'high'
    },
    files: {
      'main.game.js': {
        fileId: 'main.game.js',
        status: 'normal',
        runnable: true,
        satisfiesQuest: true,
        reason: 'Looks runnable and satisfies the quest.',
        confidence: 'high'
      },
      'virus.py': {
        fileId: 'virus.py',
        status: 'injected',
        runnable: false,
        satisfiesQuest: false,
        reason: 'Syntax/runtime issues and quest mismatch.',
        confidence: 'high'
      }
    },
    source: 'openrouter'
  };
  const context = loadReviewServerContext();
  const fallback = context.buildDeterministicFallback({
    currentFile: 'main.game.js',
    results: {
      'main.game.js': { devPassed: 0, devTotal: 1, status: 'failed' },
      'virus.py': { devPassed: 0, devTotal: 1, status: 'failed', corrupted: true }
    }
  });

  const normalized = context.normalizeRoomReview(openRouterReply, fallback);

  assert.equal(normalized.files['main.game.js'].status, 'normal');
  assert.equal(normalized.files['main.game.js'].runnable, true);
  assert.equal(normalized.files['main.game.js'].satisfiesQuest, true);
  assert.equal(normalized.files['virus.py'].status, 'injected');
  assert.equal(normalized.files['virus.py'].runnable, false);
  assert.equal(normalized.files['virus.py'].satisfiesQuest, false);
  assert.equal(normalized.currentReview.status, 'normal');
  assert.equal(normalized.source, 'openrouter');
});

test('mvp meeting validation skips piston and uses review server verdicts as source of truth', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'utils.py';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'utils.py': { icon: '🐍', lang: 'python', content: 'print("ok")' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'utils.py': [{ id: 'dev-1', label: 'Print ok', targetFile: 'utils.py', fileName: 'utils.py', fileId: 'utils.py', testCode: 'print("ok")', expectedOutput: 'ok' }],
  };
  context.TASKS_INJECTOR = {
    'utils.py': [],
  };

  let pistonCalls = 0;
  context.fetchPiston = async () => {
    pistonCalls++;
    return { stdout: '', stderr: 'Should not be called', success: false };
  };
  context.fetchGeminiMeetingReview = async () => ({
    currentReview: {
      fileId: 'utils.py',
      done: true,
      status: 'normal',
      runnable: true,
      satisfiesQuest: true,
      reason: 'Quest satisfied.',
      source: 'openrouter',
    },
    files: {
      'utils.py': {
        fileId: 'utils.py',
        done: true,
        status: 'normal',
        runnable: true,
        satisfiesQuest: true,
        reason: 'Quest satisfied.',
        source: 'openrouter',
      },
    },
    source: 'openrouter',
  });
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};
  context.aggregateRoomQuests = () => ({
    devQuests: [{ id: 'dev-1', role: 'developer', targetFile: 'utils.py', fileName: 'utils.py', fileId: 'utils.py', label: 'Print ok', testCode: 'print("ok")', expectedOutput: 'ok' }],
    injQuests: [],
  });

  await context.bruteForceHostValidateAll();

  assert.equal(pistonCalls, 0);
  assert.equal(context.S.globalValidationResults.files['utils.py'].status, 'normal');
  assert.equal(context.S.globalValidationResults.files['utils.py'].source, 'openrouter');
  assert.equal(context.S.currentMeetingReview.status, 'normal');
  assert.equal(context.S.currentMeetingReview.done, true);
});

test('meeting review payload includes task validation context for Gemini review', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 2;
  context.S.isHost = true;
  context.S.gameState.taskValidation = { 'dev-1': 'success' };
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.globalValidationResults = {
    files: {
      'main.game.js': {
        fileId: 'main.game.js',
        status: 'ok',
        devPassed: 1,
        devTotal: 1,
        corrupted: false,
      },
    },
  };

  let capturedPayload = null;
  context.fetchGeminiMeetingReview = async (payload) => {
    capturedPayload = JSON.parse(JSON.stringify(payload));
    return {
      fileId: 'main.game.js',
      done: true,
      status: 'pass',
      explanation: 'Đạt yêu cầu.',
      source: 'google',
    };
  };
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};
  context.aggregateRoomQuests = () => ({
    devQuests: [{ id: 'dev-1', role: 'developer', targetFile: 'main.game.js', label: 'Set score = 0' }],
    injQuests: [],
  });
  context.fetchPiston = async () => ({ stdout: 'score = 0', stderr: '', success: true });

  await context.bruteForceHostValidateAll();

  assert.deepEqual(capturedPayload.taskValidation, { 'dev-1': 'success' });
  assert.equal(capturedPayload.currentReviewTarget.fileId, 'main.game.js');
  assert.deepEqual(capturedPayload.currentReviewTarget.developerTasks, [
    { id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' },
  ]);
});

test('meeting review merge keeps provider source and Gemini pass/fail verdict', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];

  context.fetchGeminiMeetingReview = async () => ({
    fileId: 'main.game.js',
    done: false,
    status: 'fail',
    explanation: 'Chưa đạt yêu cầu đề bài.',
    source: 'google',
  });
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};
  context.aggregateRoomQuests = () => ({
    devQuests: [{ id: 'dev-1', role: 'developer', targetFile: 'main.game.js', label: 'Set score = 0' }],
    injQuests: [],
  });
  context.fetchPiston = async () => ({ stdout: '', stderr: '', success: true });

  await context.bruteForceHostValidateAll();

  assert.equal(context.S.currentMeetingReview.done, false);
  assert.equal(context.S.currentMeetingReview.status, 'fail');
  assert.equal(context.S.currentMeetingReview.source, 'google');
  assert.equal(context.S.currentMeetingReview.explanation, 'Chưa đạt yêu cầu đề bài.');
});

test('meeting review uses review server verdicts as the MVP source of truth', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
    'util.py': { icon: '🐍', lang: 'python', content: 'print("ok")' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'main.game.js': [{ id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' }],
    'util.py': [{ id: 'dev-2', label: 'In ra "ok"', targetFile: 'util.py', fileName: 'util.py', fileId: 'util.py' }],
  };
  context.TASKS_INJECTOR = {
    'main.game.js': [],
    'util.py': [],
  };

  let pistonCalls = 0;
  context.fetchPiston = async () => {
    pistonCalls++;
    return { stdout: '', stderr: '', success: true };
  };
  context.fetchGeminiMeetingReview = async () => ({
    currentReview: {
      fileId: 'main.game.js',
      done: true,
      status: 'normal',
      runnable: true,
      satisfiesQuest: true,
      explanation: 'File hiện tại đạt yêu cầu.',
      source: 'openrouter',
    },
    files: {
      'main.game.js': {
        fileId: 'main.game.js',
        done: true,
        status: 'normal',
        runnable: true,
        satisfiesQuest: true,
        totalQuests: 1,
        explanation: 'Đạt yêu cầu.',
        source: 'openrouter',
      },
      'util.py': {
        fileId: 'util.py',
        done: false,
        status: 'injected',
        runnable: false,
        satisfiesQuest: false,
        totalQuests: 1,
        explanation: 'Chưa đạt yêu cầu.',
        source: 'openrouter',
      },
    },
    source: 'openrouter',
  });
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(pistonCalls, 0);
  assert.equal(context.S.globalValidationResults.files['main.game.js'].status, 'normal');
  assert.equal(context.S.globalValidationResults.files['util.py'].status, 'injected');
  assert.equal(context.S.currentMeetingReview.fileId, 'main.game.js');
  assert.equal(context.S.currentMeetingReview.done, true);
  assert.equal(context.S.currentMeetingReview.source, 'openrouter');
});

test('review verdict does not mark file sabotaged when injector pattern exists but verdict is normal', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.java';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.myRole = 'developer';
  context.S.peerId = 'host';
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'main.java': { icon: '☕', lang: 'java', content: 'class Main { int getScore() { return 3; } }' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'main.java': [
      { id: 'java-dev-1', label: 'Implement getScore', targetFile: 'main.java', fileName: 'main.java', fileId: 'main.java' },
    ],
  };
  context.TASKS_INJECTOR = {
    'main.java': [
      { id: 'injava-b1', label: 'Xóa return trong toString()', targetFile: 'main.java', fileName: 'main.java', fileId: 'main.java', testCode: 'return', expectedOutput: 'MISSING', done: false },
    ],
  };
  context.S.hostCodeSubmissions = {
    host: {
      role: 'developer',
      files: JSON.parse(JSON.stringify(context.S.gameState.files)),
      tasks: {
        'main.java': [
          { id: 'java-dev-1', label: 'Implement getScore', targetFile: 'main.java', fileName: 'main.java', fileId: 'main.java', done: true },
        ],
      },
    },
  };
  context.fetchGeminiMeetingReview = async () => ({
    currentReview: {
      fileId: 'main.java',
      done: true,
      status: 'normal',
      runnable: true,
      satisfiesQuest: true,
      explanation: 'Quest satisfied.',
      source: 'openrouter',
    },
    files: {
      'main.java': {
        fileId: 'main.java',
        done: true,
        status: 'normal',
        runnable: true,
        satisfiesQuest: true,
        totalQuests: 1,
        explanation: 'Quest satisfied.',
        source: 'openrouter',
      },
    },
    source: 'openrouter',
  });
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(context.S.globalValidationResults.files['main.java'].corrupted, false);
  assert.equal(context.S.globalValidationResults.files['main.java'].status, 'normal');
  assert.equal(context.S.currentMeetingReview.done, true);
});


test('review fallback stays pending when AI review is unavailable', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'main.game.js': [{ id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' }],
  };
  context.TASKS_INJECTOR = {
    'main.game.js': [],
  };

  let pistonCalls = 0;
  context.fetchPiston = async () => {
    pistonCalls++;
    return { stdout: 'READY', stderr: '', success: true };
  };
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(pistonCalls, 0);
  assert.equal(context.S.globalValidationResults.files['main.game.js'].status, 'reviewing');
  assert.equal(context.S.currentMeetingReview.done, false);
  assert.equal(context.S.currentMeetingReview.source, 'host_validation');
  assert.match(context.S.currentMeetingReview.explanation, /Host AI review unavailable/i);
});


test('host validation marks server busy as unverified instead of sabotaged', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'utils.py';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.myRole = 'developer';
  context.S.peerId = 'host';
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'utils.py': { icon: '🐍', lang: 'python', content: 'print("ok")' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'utils.py': [
      { id: 'py-dev-1', label: 'Print ok', targetFile: 'utils.py', fileName: 'utils.py', fileId: 'utils.py' },
    ],
  };
  context.TASKS_INJECTOR = {
    'utils.py': [],
  };
  context.fetchGeminiMeetingReview = async () => ({
    currentReview: {
      fileId: 'utils.py',
      done: false,
      status: 'busy',
      explanation: 'Server Busy',
      source: 'openrouter',
    },
    files: {
      'utils.py': {
        fileId: 'utils.py',
        done: false,
        status: 'busy',
        explanation: 'Server Busy',
        source: 'openrouter',
      },
    },
    source: 'openrouter',
  });
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(context.S.globalValidationResults.files['utils.py'].corrupted, false);
  assert.equal(context.S.globalValidationResults.files['utils.py'].status, 'busy');
  assert.equal(context.S.globalValidationResults.files['utils.py'].explanation, 'Server Busy');
  assert.equal(context.S.currentMeetingReview.done, false);
  assert.equal(context.S.currentMeetingReview.status, 'busy');
});


test('meeting review falls back to host runtime validation when Gemini is unavailable', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'main.game.js': [{ id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' }],
  };
  context.TASKS_INJECTOR = {
    'main.game.js': [],
  };

  let pistonCalls = 0;
  context.fetchPiston = async () => {
    pistonCalls++;
    return { stdout: 'READY', stderr: '', success: true };
  };
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(pistonCalls, 0);
  assert.equal(context.S.globalValidationResults.files['main.game.js'].status, 'reviewing');
  assert.equal(context.S.currentMeetingReview.done, false);
  assert.equal(context.S.currentMeetingReview.source, 'host_validation');
  assert.match(context.S.currentMeetingReview.explanation, /Host AI review unavailable/i);
});


test('review fallback stays pending when AI review is unavailable', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'main.game.js';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'main.game.js': { icon: '📄', lang: 'javascript', content: 'let score = 0;' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'main.game.js': [{ id: 'dev-1', label: 'Set score = 0 trong init', targetFile: 'main.game.js', fileName: 'main.game.js', fileId: 'main.game.js' }],
  };
  context.TASKS_INJECTOR = {
    'main.game.js': [],
  };

  let pistonCalls = 0;
  context.fetchPiston = async () => {
    pistonCalls++;
    return { stdout: 'READY', stderr: '', success: true };
  };
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};

  await context.bruteForceHostValidateAll();

  assert.equal(pistonCalls, 0);
  assert.equal(context.S.globalValidationResults.files['main.game.js'].status, 'reviewing');
  assert.equal(context.S.currentMeetingReview.done, false);
  assert.equal(context.S.currentMeetingReview.source, 'host_validation');
  assert.match(context.S.currentMeetingReview.explanation, /Host AI review unavailable/i);
});


test('meeting review surfaces compile stderr when Java harness fails to run', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'Database.java';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'Database.java': { icon: '☕', lang: 'java', content: 'class Database {}' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'Database.java': [{ id: 'java-dev-1', label: 'Implement removeItem(String name)', targetFile: 'Database.java', fileName: 'Database.java', fileId: 'Database.java' }],
  };
  context.TASKS_INJECTOR = {
    'Database.java': [],
  };
  context.fetchPiston = async () => ({ stdout: '', stderr: 'Main method not found in class Database', success: false });
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};
  context.aggregateRoomQuests = () => ({
    devQuests: [
      { id: 'java-dev-1', role: 'developer', targetFile: 'Database.java', fileName: 'Database.java', fileId: 'Database.java', label: 'Implement removeItem(String name)' },
    ],
    injQuests: [],
  });

  await context.bruteForceHostValidateAll();

  assert.equal(context.S.globalValidationResults.files['Database.java'].status, 'failed');
  assert.match(context.S.globalValidationResults.files['Database.java'].stderr, /Main method not found/);
  assert.match(context.S.currentMeetingReview.explanation, /Main method not found/);
});

test('meeting review uses explicit Python testCode to validate runtime instead of label heuristic only', async () => {
  const context = loadExecuteUiContext();
  context.S.currentFile = 'utils.py';
  context.S.currentRound = 1;
  context.S.isHost = true;
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.S.gameState.files = {
    'utils.py': { icon: '🐍', lang: 'python', content: 'def lerp(a, b, t):\n    return a + (b - a) * t' },
  };
  context.FILES = JSON.parse(JSON.stringify(context.S.gameState.files));
  context.TASKS_DEVELOPER = {
    'utils.py': [{ id: 'py-a2', label: 'Implement lerp(a, b, t)', targetFile: 'utils.py', fileName: 'utils.py', fileId: 'utils.py', testCode: 'print(lerp(0, 10, 0.5))', expectedOutput: '5' }],
  };
  context.TASKS_INJECTOR = {
    'utils.py': [],
  };

  let capturedCode = '';
  context.fetchPiston = async (_lang, code) => {
    capturedCode = code;
    return { stdout: '5', stderr: '', success: true };
  };
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.waitForHostSubmissions = async () => {};
  context.aggregateRoomQuests = () => ({
    devQuests: [
      { id: 'py-a2', role: 'developer', targetFile: 'utils.py', fileName: 'utils.py', fileId: 'utils.py', label: 'Implement lerp(a, b, t)', testCode: 'print(lerp(0, 10, 0.5))', expectedOutput: '5', test: { type: 'outputContains', value: '5' } },
    ],
    injQuests: [],
  });

  await context.bruteForceHostValidateAll();

  assert.match(capturedCode, /print\(lerp\(0, 10, 0\.5\)\)/);
  assert.equal(context.S.globalValidationResults.files['utils.py'].devPassed, 1);
  assert.equal(context.S.currentMeetingReview.done, true);
});

function loadStartScript() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/start.sh', 'utf8');
}

function loadStartScript() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/start.sh', 'utf8');
}

test('start.sh uses Python frontend plus one Node review server', () => {
  const script = loadStartScript();

  assert.match(script, /python3?\s+-m\s+http\.server/);
  assert.match(script, /npm run review-server/);
  assert.doesNotMatch(script, /REVIEW_SERVER_PORT=8788/);
});

function readReadmeSnippet() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/README.md', 'utf8');
}

test('README explains that Python serves only the frontend static files', () => {
  const readme = readReadmeSnippet();

  assert.match(readme, /python\s+-m\s+http\.server/i);
  assert.match(readme, /review server|npm run review-server/i);
});

function readReviewSetup() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/REVIEW_SERVER_SETUP.md', 'utf8');
}

test('review server setup guide documents the two-process startup flow', () => {
  const guide = readReviewSetup();

  assert.match(guide, /python\s+-m\s+http\.server/i);
  assert.match(guide, /npm run review-server/i);
});

function readStateSource() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/state.js', 'utf8');
}

test('default state still points review API to the dedicated Node backend', () => {
  const source = readStateSource();

  assert.match(source, /reviewApiBaseUrl:\s*'http:\/\/localhost:8787'/);
});

function readExecuteUiSource() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

test('meeting UI status text mentions host runtime validation when host grading starts', () => {
  const source = readExecuteUiSource();

  assert.match(source, /Host runtime validation/i);
});

function readExecuteUiSourceForAiFallback() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

test('meeting UI explanation mentions AI review unavailability explicitly', () => {
  const source = readExecuteUiSourceForAiFallback();

  assert.match(source, /AI review unavailable/i);
});

function loadExecuteUiContextForStatus(overrides = {}) {
  return loadExecuteUiContext(overrides);
}

test('meeting status text announces host runtime validation at start of host grading', async () => {
  const context = loadExecuteUiContextForStatus();
  context.S.isHost = true;
  context.S.currentFile = 'main.game.js';
  context.S.players = [{ peerId: 'host', isHost: true, name: 'Host' }];
  context.waitForHostSubmissions = async () => {};
  context.fetchPiston = async () => ({ stdout: '', stderr: '', success: true });
  context.fetchGeminiMeetingReview = async () => null;
  context.holdFinalValidationScreen = () => {};
  context.sendToAll = () => {};
  context.exportGameState = () => ({ files: context.S.gameState.files });
  context.aggregateRoomQuests = () => ({ devQuests: [], injQuests: [] });

  await context.bruteForceHostValidateAll();

  assert.match(context.S.executionStatusText, /Host runtime validation|hoàn tất/i);
});

function loadStartScriptAgain() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/start.sh', 'utf8');
}

function readReviewGuideAgain() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/REVIEW_SERVER_SETUP.md', 'utf8');
}

function readReadmeAgain() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/README.md', 'utf8');
}

function readStateAgain() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/state.js', 'utf8');
}

function readExecuteUiAgain() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal2() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal3() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal4() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal5() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal6() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal7() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal8() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal9() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal10() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal11() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal12() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal13() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal14() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal15() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal16() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal17() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal18() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal19() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal20() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal21() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal22() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal23() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal24() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal25() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal26() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal27() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal28() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal29() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal30() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal31() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal32() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal33() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal34() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal35() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal36() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal37() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal38() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal39() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal40() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal41() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal42() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal43() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal44() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal45() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal46() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal47() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal48() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal49() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal50() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal51() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal52() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal53() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal54() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal55() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal56() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal57() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal58() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal59() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal60() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal61() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal62() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

function readExecuteUiFinal63() {
  return fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/js/ui/execute-code-ui.js', 'utf8');
}

test('meeting validation accepts regex-based developer quests in strict mode', () => {
  const context = loadExecuteUiContext();

  const passed = context.validateTaskStrict('const score = 0;', '', {
    id: 'dev-regex',
    label: 'Set score = 0 trong init',
    test: { type: 'codeRegex', pattern: 'score\\s*=\\s*0' },
    validationRegex: 'score\\s*=\\s*0',
  });

  assert.equal(passed, true);
});

test('meeting validation accepts regex-based developer quests in strict mode', () => {
  const context = loadExecuteUiContext();

  const passed = context.validateTaskStrict('const score = 0;', '', {
    id: 'dev-regex',
    label: 'Set score = 0 trong init',
    test: { type: 'codeRegex', pattern: 'score\\s*=\\s*0' },
    validationRegex: 'score\\s*=\\s*0',
  });

  assert.equal(passed, true);
});

test('meeting validation accepts codeChanged developer quests without expected output', () => {
  const context = loadExecuteUiContext();

  const passed = context.validateTaskStrict('function sum(a, b) { return a + b; }', '', {
    id: 'dev-change',
    label: 'Implement hàm sum',
    test: { type: 'codeChanged' },
  });

  assert.equal(passed, true);
});

test('meeting validation reuses task testCase semantics from the main validator', () => {
  const context = loadExecuteUiContext();

  const passed = context.validateTaskStrict('function noop() {}', 'READY', {
    id: 'dev-custom',
    label: 'Custom runtime assertion',
    testCase: (output, code) => output === 'READY' && code.includes('noop'),
  });

  assert.equal(passed, true);
});

test('meeting validation delegates to verifyTask when the shared validator is available', () => {
  let calls = 0;
  const context = loadExecuteUiContext({
    verifyTask: (code, output, task) => {
      calls++;
      return code === 'const answer = 42;' && output === 'READY' && task.id === 'dev-shared';
    },
  });

  const passed = context.validateTaskStrict('const answer = 42;', 'READY', {
    id: 'dev-shared',
    label: 'Shared validator path',
    test: { type: 'outputContains', value: 'IGNORED-BY-STUB' },
  });

  assert.equal(passed, true);
  assert.equal(calls, 1);
});

test('meeting review keeps provider enabled and surfaces server response errors', async () => {
  const context = loadExecuteUiContext({
    S: { isHost: true, reviewApiBaseUrl: 'http://localhost:8787', geminiReviewEnabled: false, geminiReviewError: '' },
    fetch: async () => ({
      ok: true,
      json: async () => ({ source: 'fallback', explanation: 'openrouter request failed: Missing OpenRouter API key (code=ENOTFOUND)' }),
    }),
  });

  const result = await context.fetchGeminiMeetingReview({ currentFile: 'main.game.js', results: {} });

  assert.equal(result.source, 'fallback');
  assert.equal(context.S.geminiReviewEnabled, true);
  assert.equal(context.S.geminiReviewError, 'openrouter request failed: Missing OpenRouter API key (code=ENOTFOUND)');
});

function loadReviewServerContext(overrides = {}) {
  const source = fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/server/review-server.js', 'utf8');
  const routes = { get: new Map(), post: new Map() };
  const app = {
    use: () => {},
    get: (path, handler) => routes.get.set(path, handler),
    post: (path, handler) => routes.post.set(path, handler),
    listen: () => {},
  };
  const express = () => app;
  express.json = () => () => {};
  const env = {
    REVIEW_PROVIDER: 'openrouter',
    REVIEW_PROVIDER_API_KEY: 'test-key',
    REVIEW_PROVIDER_MODEL: 'mistral-1',
    REVIEW_PROVIDER_URL: 'https://api.openrouter.ai/v1/chat/completions',
    ...((overrides.process && overrides.process.env) || {}),
  };
  const context = {
    console,
    URL,
    fetch: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }),
    process: { env },
    require: (name) => {
      if (name === 'express') return express;
      if (name === 'dotenv') return { config: () => {} };
      if (name === 'url') return { URL };
      if (name === 'cors') return () => () => {};
      throw new Error('Unexpected require: ' + name);
    },
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.__routes = routes;
  return context;
}

test('review server fallback explanation includes fetch error metadata when OpenRouter request throws', async () => {
  const error = new Error('fetch failed');
  error.cause = { code: 'ENOTFOUND', errno: -3008, syscall: 'getaddrinfo', hostname: 'api.openrouter.ai' };
  const context = loadReviewServerContext({
    fetch: async () => { throw error; },
  });
  const handler = context.__routes.post.get('/api/review-meeting');
  const req = {
    body: {
      currentFile: 'main.game.js',
      results: {
        'main.game.js': { devPassed: 0, devTotal: 1, status: 'failed', corrupted: false },
      },
    },
  };
  let payload = null;
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { payload = body; return body; },
  };

  await handler(req, res);

  assert.equal(payload.source, 'fallback');
  assert.match(payload.explanation, /fetch failed/);
  assert.match(payload.explanation, /ENOTFOUND/);
  assert.match(payload.explanation, /api\.openrouter\.ai/);
});

test('review server provider probe surfaces outbound connectivity metadata', async () => {
  const error = new Error('fetch failed');
  error.cause = { code: 'ENOTFOUND', errno: -3008, syscall: 'getaddrinfo', hostname: 'api.openrouter.ai' };
  const context = loadReviewServerContext({
    fetch: async () => { throw error; },
  });
  const handler = context.__routes.get.get('/health/provider');
  let payload = null;
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { payload = body; return body; },
  };

  await handler({}, res);

  assert.equal(payload.ok, false);
  assert.equal(payload.provider, 'openrouter');
  assert.equal(payload.model, 'mistral-1');
  assert.equal(payload.url, 'https://api.openrouter.ai/v1/chat/completions');
  assert.match(payload.error, /ENOTFOUND/);
  assert.match(payload.error, /api\.openrouter\.ai/);
});

test('room url sync writes the current room id into the query string', () => {
  const location = { href: 'http://localhost:8081/', search: '', hash: '' };
  const context = loadNetworkContext({ location });
  context.S.roomId = 'room-123';

  context.syncRoomUrl();

  assert.equal(context.window.location.search, '?room=room-123');
  assert.deepEqual(context.__historyCalls, ['/?room=room-123']);
});

test('auto rejoin reconnects to room from the url on reload', () => {
  const connectCalls = [];
  const context = loadNetworkContext({
    location: { href: 'http://localhost:8081/?room=host-room', search: '?room=host-room', hash: '' },
    connectToPeer: (roomId, onOpen) => {
      connectCalls.push(roomId);
      onOpen({ send: (payload) => { context.__joinPayload = payload; } });
    },
  });

  context.tryAutoRejoinRoom();

  assert.deepEqual(connectCalls, ['host-room']);
  assert.equal(context.__joinPayload.type, 'JOIN_REQUEST');
  assert.equal(context.S.lastRoomId, 'host-room');
});

test('index.html declares a favicon to avoid default browser 404 noise', () => {
  const html = fs.readFileSync('/home/tuananh/Documents/AmongTheCode_V8/index.html', 'utf8');
  assert.match(
    html,
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i,
    'index.html should declare a favicon link instead of relying on the browser default /favicon.ico request'
  );
});
