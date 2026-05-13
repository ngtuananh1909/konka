const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('./deterministic/state/room-manager');
const { inferTaskTest, verifyTask, normalizeRoomResults } = require('./deterministic/validation/quest-verifier');
const { validateRoomSubmission } = require('./deterministic/validation/submission-service');

test('inferTaskTest keeps deterministic regex behavior for known quest labels', () => {
  assert.deepEqual(inferTaskTest('Set score = 0 trong init'), { type: 'codeRegex', pattern: 'score\\s*=\\s*0' });
  assert.deepEqual(inferTaskTest('Thêm "Game running" ra output'), { type: 'outputContains', value: 'Game running' });
});

test('verifyTask detects sabotage and missing patterns deterministically', () => {
  assert.equal(verifyTask('while(true){}', '', { testCode: 'while\\s*\\(\\s*true\\s*\\)', expectedOutput: 'SABOTAGE' }), true);
  assert.equal(verifyTask('const width = 10;', '', { testCode: 'height', expectedOutput: 'MISSING' }), true);
});

test('validateRoomSubmission marks a clean JavaScript room as normal when all developer quests pass', async () => {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom({
    language: 'javascript',
    files: {
      'main.game.js': 'let score = 0;\nfunction gameLoop() {}',
      'engine.js': 'class EventEmitter { constructor(){ this.listeners = {}; } on(event, fn) {} emit(event) { console.log("OK"); } }',
      'ui.js': 'class UI {}'
    }
  });

  room.files['main.game.js'].simulatedOutput = '0\nOK';
  room.files['engine.js'].simulatedOutput = 'OK';
  room.files['ui.js'].simulatedOutput = 'OK';

  const results = await validateRoomSubmission(room);

  assert.equal(results.files['main.game.js'].status, 'normal');
  assert.equal(results.files['engine.js'].status, 'normal');
  assert.equal(results.summary.injectedFiles, 0);
});

test('validateRoomSubmission marks sabotage patterns as injected', async () => {
  const roomManager = new RoomManager();
  const room = roomManager.createRoom({
    language: 'javascript',
    files: {
      'main.game.js': 'let score = 0;\nfunction gameLoop() { while(true){} }',
      'engine.js': 'class EventEmitter { constructor(){ this.listeners = {}; } on(event, fn) {} emit(event) { console.log("OK"); } }',
      'ui.js': 'class UI {}'
    }
  });

  room.files['main.game.js'].simulatedOutput = '0\nOK';
  room.files['engine.js'].simulatedOutput = 'OK';
  room.files['ui.js'].simulatedOutput = 'OK';

  const results = await validateRoomSubmission(room);

  assert.equal(results.files['main.game.js'].status, 'injected');
  assert.equal(results.files['main.game.js'].reason, 'timeout');
});

test('normalizeRoomResults aggregates file verdicts and quest counts', () => {
  const room = {
    roomId: 'room-1',
    files: {
      'main.game.js': { content: 'let score = 0;' }
    },
    developerTasks: {
      'main.game.js': [
        { id: 'dev-1', label: 'Set score = 0 trong init', expectedOutput: '0', test: { type: 'codeRegex', pattern: 'score\\s*=\\s*0' } }
      ]
    },
    injectorTasks: {
      'main.game.js': []
    }
  };

  const normalized = normalizeRoomResults(room, {
    'main.game.js': { success: true, output: '0', stderr: '', reason: 'passed' }
  });

  assert.equal(normalized.summary.completedQuests, 1);
  assert.equal(normalized.summary.totalQuests, 1);
  assert.equal(normalized.files['main.game.js'].status, 'normal');
});