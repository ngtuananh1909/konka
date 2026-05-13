function cleanText(value) {
  return String(value == null ? '' : value).trim().replaceAll('\r', '');
}

function inferTaskTest(label) {
  const text = label || '';
  const quoted = text.match(/[“\"]([^”\"]+)[”\"]/);
  if (/score\s*=\s*0|score=0/i.test(text)) return { type: 'codeRegex', pattern: 'score\\s*=\\s*0' };
  if (/running\s*=\s*true/i.test(text)) return { type: 'codeRegex', pattern: 'running\\s*=\\s*true' };
  if (/running\s*=\s*false/i.test(text)) return { type: 'codeRegex', pattern: 'running\\s*=\\s*false' };
  if (/isRunning\s*=\s*true/i.test(text)) return { type: 'codeRegex', pattern: 'isRunning\\s*=\\s*true' };
  if (/is_running\s*=\s*False/i.test(text)) return { type: 'codeRegex', pattern: 'is_running\\s*=\\s*False' };
  if (/return\s+True|True\/False/i.test(text)) return { type: 'codeRegex', pattern: 'return\\s+(True|False)' };
  if (/clamp/i.test(text)) return { type: 'codeRegex', pattern: 'max\\s*\\(\\s*min\\s*\\(|min\\s*\\(\\s*max\\s*\\(' };
  if (/lerp/i.test(text)) return { type: 'codeRegex', pattern: 'a\\s*\\+\\s*\\(?b\\s*-\\s*a\\)?\\s*\\*\\s*t' };
  if (/toString/i.test(text)) return { type: 'codeRegex', pattern: 'return\\s+.*players' };
  if (/Game running/i.test(text)) return { type: 'outputContains', value: 'Game running' };
  if (quoted) return { type: 'outputContains', value: quoted[1] };
  return { type: 'codeChanged' };
}

function withDerivedTest(task) {
  if (task.test || task.validationRegex || task.expectedOutput) return { ...task, test: task.test || inferTaskTest(task.label) };
  return { ...task, test: inferTaskTest(task.label) };
}

function verifyTask(codeSnapshot, outputSnapshot, task) {
  const code = cleanText(codeSnapshot);
  const output = cleanText(outputSnapshot);
  const prepared = withDerivedTest(task || {});
  const test = prepared.test || {};
  const expected = cleanText(prepared.expectedOutput || test.value || '');

  if (prepared.testCode && /SABOTAGE|MISSING/.test(expected)) {
    try {
      if (expected === 'SABOTAGE') return new RegExp(prepared.testCode).test(code);
      if (expected === 'MISSING') return !new RegExp(prepared.testCode).test(code);
    } catch {
      return expected === 'MISSING' ? !code.includes(prepared.testCode) : code.includes(prepared.testCode);
    }
  }

  if (test.type === 'codeRegex' || prepared.validationRegex) {
    const pattern = test.pattern || prepared.validationRegex;
    if (!pattern) return false;
    return new RegExp(pattern, test.flags || '').test(code);
  }
  if (test.type === 'outputRegex') {
    if (!test.pattern) return false;
    return new RegExp(test.pattern, test.flags || '').test(output);
  }
  if (test.type === 'outputContains') return expected ? output.includes(expected) : false;
  if (test.type === 'codeChanged') return code.length > 0;
  if (typeof prepared.testCase === 'function') return prepared.testCase(output, code);
  if (!expected) return false;
  return output === expected || output.includes(expected);
}

function verifyFileIntegrity(codeSnapshot, injectorTasks) {
  const matched = (injectorTasks || []).filter(task => verifyTask(codeSnapshot, '', task));
  return {
    corrupted: matched.length > 0,
    matchedTaskIds: matched.map(task => task.id)
  };
}

function normalizeFileResult(fileId, file, executionResult, developerTasks, injectorTasks) {
  const code = file && file.content || '';
  const output = executionResult && executionResult.output || '';
  const runnable = !!(executionResult && executionResult.success);
  const devResults = (developerTasks || []).map(task => ({ taskId: task.id, passed: runnable && verifyTask(code, output, task) }));
  const integrity = verifyFileIntegrity(code, injectorTasks);
  const completedQuests = devResults.filter(result => result.passed).length;
  const totalQuests = (developerTasks || []).length;
  const satisfiesQuest = totalQuests > 0 && completedQuests === totalQuests;
  const reason = !runnable
    ? (executionResult && executionResult.reason) || 'compile_error'
    : integrity.corrupted
      ? 'sabotage_detected'
      : satisfiesQuest
        ? 'passed'
        : 'quest_failed';

  return {
    fileId,
    runnable,
    satisfiesQuest,
    completedQuests,
    totalQuests,
    corrupted: integrity.corrupted,
    status: runnable && satisfiesQuest && !integrity.corrupted ? 'normal' : 'injected',
    output,
    stderr: executionResult && executionResult.stderr || '',
    reason,
    matchedInjectorTaskIds: integrity.matchedTaskIds,
    taskResults: devResults
  };
}

function normalizeRoomResults(room, executionResultsByFile) {
  const files = {};
  let devCompleted = 0;
  let devTotal = 0;
  let corruptedCount = 0;
  for (const [fileId, file] of Object.entries(room.files || {})) {
    const normalized = normalizeFileResult(
      fileId,
      file,
      executionResultsByFile[fileId] || { success: false, output: '', stderr: 'missing execution result', reason: 'missing_result' },
      (room.developerTasks && room.developerTasks[fileId]) || [],
      (room.injectorTasks && room.injectorTasks[fileId]) || []
    );
    files[fileId] = normalized;
    devCompleted += normalized.completedQuests;
    devTotal += normalized.totalQuests;
    if (normalized.corrupted) corruptedCount += 1;
  }
  return {
    roomId: room.roomId,
    status: 'complete',
    files,
    summary: {
      totalFiles: Object.keys(files).length,
      normalFiles: Object.values(files).filter(file => file.status === 'normal').length,
      injectedFiles: Object.values(files).filter(file => file.status === 'injected').length,
      completedQuests: devCompleted,
      totalQuests: devTotal,
      corruptedFiles: corruptedCount
    }
  };
}

module.exports = {
  cleanText,
  inferTaskTest,
  verifyTask,
  verifyFileIntegrity,
  normalizeFileResult,
  normalizeRoomResults
};