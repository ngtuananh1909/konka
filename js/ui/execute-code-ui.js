/* ============================================================
   ui/execute-code-ui.js  [UI + LOGIC]
   Màn hình "Executing Code" hiển thị 10 giây trước khi vào
   Meeting Phase.

   Hiển thị kết quả chạy từng file dựa trên:
     - Developer tasks đã hoàn thành → ✅ file OK → tiến độ cộng
     - Injector tasks đã hoàn thành trên file đó → ❌ file lỗi
       → thanh tiến độ KHÔNG cập nhật cho file đó

   Flow:
     startExecuteScreen() →  10s countdown → enterMeetingPhase()
   ============================================================ */

/**
 * Tính trạng thái từng file khi execute:
 * Trả về object { filename: { devDone, injDone, status, tasks } }
 *
 * status:
 *   'ok'      — có ít nhất 1 dev task done, không bị inject
 *   'error'   — có injector task done trên file này
 *   'pending' — chưa có dev task nào done
 */
function computeExecuteResults() {
    const results = {};

    // Build a unified set of completed dev task IDs:
    // 1. S.allCompletedDevTasks — broadcast aggregate from all players
    // 2. S.completedTaskIds     — local player's own completions
    // We merge both because allCompletedDevTasks may be empty if
    // playing solo or if network sync hasn't propagated yet.
    const devCompletedSet = new Set();
    if (S.allCompletedDevTasks && S.allCompletedDevTasks.size > 0) {
        S.allCompletedDevTasks.forEach(id => devCompletedSet.add(id));
    }
    // Also include local tasks that are marked done in S.tasks
    if (S.tasks) {
        Object.keys(S.tasks).forEach(fn => {
            (S.tasks[fn] || []).forEach(t => {
                if (t.done && S.myRole !== 'injector') {
                    devCompletedSet.add(t.id);
                }
            });
        });
    }
    // Also fallback to completedTaskIds for non-injector tasks
    if (S.completedTaskIds && S.myRole !== 'injector') {
        S.completedTaskIds.forEach(id => {
            if (!id.startsWith('in')) devCompletedSet.add(id);
        });
    }

    // Build a unified set of completed injector task IDs
    const injCompletedSet = new Set();
    if (S.allCompletedInjTasks && S.allCompletedInjTasks.size > 0) {
        S.allCompletedInjTasks.forEach(id => injCompletedSet.add(id));
    }
    // Also include local injector tasks if this player is injector
    if (S.tasks && S.myRole === 'injector') {
        Object.keys(S.tasks).forEach(fn => {
            (S.tasks[fn] || []).forEach(t => {
                if (t.done) injCompletedSet.add(t.id);
            });
        });
    }
    if (S.completedTaskIds && S.myRole === 'injector') {
        S.completedTaskIds.forEach(id => injCompletedSet.add(id));
    }

    Object.keys(FILES).forEach(fn => {
        // Collect completed dev task ids for this file
        const devTasksDone = (TASKS_DEVELOPER[fn] || []).filter(t => {
            return devCompletedSet.has(t.id);
        });

        // Collect completed injector task ids for this file
        const injTasksDone = (TASKS_INJECTOR[fn] || []).filter(t => {
            return injCompletedSet.has(t.id);
        });

        let status = 'pending';
        if (injTasksDone.length > 0) {
            status = 'error';       // file bị sabotage — override mọi thứ
        } else if (devTasksDone.length > 0) {
            status = 'ok';
        }

        results[fn] = {
            devDone:  devTasksDone.length,
            devTotal: (TASKS_DEVELOPER[fn] || []).length,
            injDone:  injTasksDone.length,
            status,
            icon:     FILES[fn].icon || '📄',
            lang:     FILES[fn].lang || '',
        };
    });

    return results;
}

/**
 * Áp dụng kết quả execute vào S.taskProgress:
 * Chỉ file 'ok' mới đóng góp vào thanh tiến độ chung.
 */
function applyExecuteResultsToProgress(results) {
    if (!S.isHost) return;
    recalculateGlobalProgress();
    patchProgressBar();
}

const PISTON_RUNTIME = {
    javascript: { language: 'javascript', version: '18.15.0' },
    python:     { language: 'python',     version: '3.10.0' },
    java:       { language: 'java',       version: '15.0.2' },
    c:          { language: 'c',          version: '10.2.1' },
    cpp:        { language: 'cpp',        version: '10.2.0' },
    typescript: { language: 'typescript', version: '5.0.3' },
    rust:       { language: 'rust',       version: '1.68.2' },
    go:         { language: 'go',         version: '1.16.2' },
};

async function fetchPiston(lang, code, testInput, fileName) {
    const runtime = PISTON_RUNTIME[lang] || { language: lang, version: '*' };
    const payload = {
        language: runtime.language,
        version: runtime.version,
        files: [{ name: fileName || ('main.' + lang), content: code || '' }],
        stdin: testInput || '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
    };
    const request = () => fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    let res = await request();
    if (res.status === 401 || res.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        res = await request();
        if (res.status === 401 || res.status === 429) return { stdout: '', stderr: 'Server Busy', success: false, code: res.status, busy: true };
    }
    if (!res.ok) throw new Error('Piston HTTP ' + res.status);
    const data = await res.json();
    const stdout = [data.run && data.run.stdout, data.compile && data.compile.stdout].filter(Boolean).join('\n').trim();
    const stderr = [data.compile && data.compile.stderr, data.run && data.run.stderr].filter(Boolean).join('\n').trim();
    const codeValue = data.run ? data.run.code : data.compile && data.compile.code;
    return { stdout, stderr, success: !stderr && (!data.run || data.run.code === 0), code: codeValue, raw: data };
}

function getPendingTasksForFile(fileId) {
    if (!FILES[fileId]) return { devTasks: [], injTasks: [], tasks: [] };
    const validation = S.gameState && S.gameState.taskValidation || {};
    const onlyThisFile = task => {
        const target = task.targetFile || task.fileName || task.fileId || fileId;
        return target === fileId;
    };
    const isUnfinished = task => validation[task.id] !== 'success';
    const devTasks = (TASKS_DEVELOPER[fileId] || []).filter(onlyThisFile).filter(isUnfinished);
    const injTasks = (TASKS_INJECTOR[fileId] || []).filter(onlyThisFile).filter(isUnfinished);
    return { devTasks, injTasks, tasks: [...devTasks, ...injTasks] };
}

function getAllQuestsForFile(fileId) {
    if (!FILES[fileId]) return [];
    const devQuests = (TASKS_DEVELOPER[fileId] || []).filter(q => {
        const target = q.targetFile || q.fileName || q.fileId || fileId;
        return target === fileId;
    });
    const injQuests = (TASKS_INJECTOR[fileId] || []).filter(q => {
        const target = q.targetFile || q.fileName || q.fileId || fileId;
        return target === fileId;
    });
    return [...devQuests, ...injQuests];
}

function generateQuestList(fileId) {
    return getAllQuestsForFile(fileId);
}

function summarizeCurrentFileReview(results, fileId) {
    const activeFileId = fileId || S.currentFile;
    const resultMap = results && results.files ? results.files : results || {};
    const current = resultMap[activeFileId] || {};
    const completedQuests = Number(current.completedQuests ?? current.devPassed ?? current.devDone ?? 0);
    const totalQuests = Number(current.totalQuests ?? current.devTotal ?? 0);
    const explicitNormal = current.status === 'normal';
    const explicitInjected = current.status === 'injected';
    const explicitBusy = current.status === 'busy';
    const done = typeof current.done === 'boolean'
        ? current.done
        : explicitNormal
            ? true
            : explicitInjected || explicitBusy
                ? false
                : totalQuests > 0 && completedQuests === totalQuests && !current.corrupted;
    const status = current.status || (current.corrupted ? 'sabotaged' : completedQuests > 0 ? 'ok' : 'pending');
    return {
        fileId: activeFileId,
        done,
        completedQuests,
        totalQuests,
        status,
        explanation: current.reason || current.explanation || '',
        source: current.source || 'host_validation',
    };
}
async function fetchGeminiMeetingReview(payload) {
    if (!S.isHost) return null;
    const baseUrl = (S.reviewApiBaseUrl || '').trim();
    if (!baseUrl) return null;
    try {
        const response = await fetch(baseUrl.replace(/\/$/, '') + '/api/review-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Review API HTTP ' + response.status);
        const data = await response.json();
        S.geminiReviewEnabled = true;
        S.geminiReviewError = data && data.source === 'fallback' && data.explanation ? data.explanation : '';
        return data;
    } catch (error) {
        S.geminiReviewEnabled = false;
        S.geminiReviewError = error.message;
        return null;
    }
}

function escapeFileSelectorValue(value) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(value));
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function cleanValidationText(value) {
    return String(value == null ? '' : value).trim().replaceAll('\r', '');
}

function validateTaskStrict(codeSnapshot, outputSnapshot, task) {
    const code = cleanValidationText(codeSnapshot);
    const output = cleanValidationText(outputSnapshot);
    const expected = cleanValidationText(task.expectedOutput || (task.test && task.test.value) || '');
    if (task.testCode && /SABOTAGE|MISSING/.test(expected)) {
        const pattern = task.testCode;
        try {
            if (expected === 'SABOTAGE') return new RegExp(pattern).test(code);
            if (expected === 'MISSING') return !new RegExp(pattern).test(code);
        } catch (e) {
            return code.includes(pattern);
        }
    }
    if (typeof verifyTask === 'function') return verifyTask(code, output, task);
    const test = task && task.test || {};
    if (test.type === 'codeRegex' || task.validationRegex) {
        const pattern = test.pattern || task.validationRegex;
        if (!pattern) return false;
        return new RegExp(pattern, test.flags || '').test(code);
    }
    if (test.type === 'outputRegex') {
        if (!test.pattern) return false;
        return new RegExp(test.pattern, test.flags || '').test(output);
    }
    if (test.type === 'codeChanged') return code.length > 0;
    if (typeof task.testCase === 'function') return task.testCase(output, code);
    if (!expected) return false;
    return output === expected || output.includes(expected);
}

function verifyFileIntegrity(fileId, codeSnapshot, pendingSnapshot, pistonResult) {
    const injTasks = (pendingSnapshot && pendingSnapshot.injTasks || []).filter(task => task && task.done);
    if (!injTasks.length) return { corrupted: false, lines: [] };
    const matched = injTasks.filter(task => validateTaskStrict(codeSnapshot || '', pistonResult && pistonResult.stdout || '', task));
    return {
        corrupted: matched.length > 0,
        lines: matched.map(task => task.label || task.id),
    };
}

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTaskExpectedOutput(task) {
    return task && (task.expectedOutput || task.expected || task.output || task.testInput || task.stdin || (task.test && task.test.value)) || '';
}

function injectHostTest(code, lang, tasks) {
    const testLines = [];
    (tasks || []).forEach(task => {
        const testCode = task.testCode || '';
        if (!testCode) return;
        if (lang === 'python') {
            testLines.push(testCode);
        } else if (lang === 'javascript' || lang === 'typescript') {
            testLines.push(testCode);
        } else if (lang === 'java') {
            testLines.push(testCode);
        } else if (lang === 'cpp' || lang === 'c') {
            testLines.push(testCode);
        }
    });
    return testLines.length ? (code || '') + '\n\n' + testLines.join('\n') : (code || '');
}

function makeFailResults(reason) {
    const files = {};
    Object.keys(S.gameState.files || FILES || {}).forEach(fileId => {
        const file = (S.gameState.files && S.gameState.files[fileId]) || FILES[fileId];
        const pending = getPendingTasksForFile(fileId);
        files[fileId] = {
            fileId,
            icon: file && file.icon,
            lang: file && file.lang,
            success: false,
            output: '',
            stderr: reason || 'Validation timeout',
            status: pending.tasks.length ? 'failed' : 'no_tasks',
            corrupted: false,
            devPassed: 0,
            devTotal: pending.devTasks.length,
            injPassed: 0,
            injTotal: pending.injTasks.length,
        };
    });
    return { status: 'complete', files, globalProgress: S.gameState.globalProgress || 0, sabotageProgress: S.gameState.sabotageProgress || 0 };
}

async function waitForHostSubmissions() {
    if (!S.isHost) return;
    S.hostCodeSubmissions = S.hostCodeSubmissions || {};
    const expectedIds = (S.players || []).filter(p => p && p.peerId && !p.isSpectator).map(p => p.peerId);
    const hostId = S.peerId || ((S.players || []).find(p => p.isHost) || {}).peerId || 'host';
    if (typeof collectLocalCodeSnapshot === 'function') S.hostCodeSubmissions[hostId] = { files: collectLocalCodeSnapshot(), role: S.myRole, tasks: clonePlain(S.tasks || {}) };
    const deadline = Date.now() + 3000;
    S.validationSubmissionDeadline = deadline;
    while (Date.now() < deadline) {
        const received = expectedIds.filter(id => S.hostCodeSubmissions[id]).length;
        if (received >= expectedIds.length) break;
        S.executionStatusText = `Host đang chờ code ${received}/${expectedIds.length} người chơi...`;
        scheduleValidationRender();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    Object.values(S.hostCodeSubmissions).forEach(submission => {
        const files = submission && submission.files ? submission.files : submission;
        Object.keys(files || {}).forEach(fileId => {
            if (!S.gameState.files[fileId]) return;
            S.gameState.files[fileId].content = files[fileId].content || '';
            if (FILES[fileId]) FILES[fileId].content = S.gameState.files[fileId].content;
        });
    });
}

function flattenQuestMap(taskMap, role, peerId) {
    const activeFiles = new Set(Object.keys(FILES));
    return Object.keys(taskMap || {}).flatMap(fileId => {
        if (!activeFiles.has(fileId)) return [];
        return (taskMap[fileId] || []).map(task => {
            const target = task.targetFile || task.fileName || task.fileId || fileId;
            if (!activeFiles.has(target)) return null;
            return {
                ...task,
                role,
                peerId,
                targetFile: target,
                fileName: target,
                fileId: target
            };
        }).filter(Boolean);
    });
}

function aggregateRoomQuests() {
    const devById = new Map();
    const injById = new Map();
    const activeFiles = new Set(Object.keys(FILES));
    const addQuest = task => {
        const target = task.targetFile || task.fileName || task.fileId;
        if (!target || !activeFiles.has(target)) return;
        const bucket = task.role === 'injector' ? injById : devById;
        if (task && task.id && !bucket.has(task.id)) {
            bucket.set(task.id, {
                ...task,
                targetFile: target,
                fileName: target,
                fileId: target
            });
        }
    };
    Object.entries(S.hostCodeSubmissions || {}).forEach(([peerId, submission]) => {
        const player = (S.players || []).find(p => p.peerId === peerId) || {};
        const role = (submission && submission.role) || ((S.injectorPeerIds || []).includes(peerId) ? 'injector' : 'developer');
        const taskMap = submission && submission.tasks || {};
        flattenQuestMap(taskMap, role, peerId).forEach(addQuest);
    });
    flattenQuestMap(TASKS_DEVELOPER, 'developer', 'global').forEach(addQuest);
    flattenQuestMap(TASKS_INJECTOR, 'injector', 'global').forEach(addQuest);
    return { devQuests: Array.from(devById.values()), injQuests: Array.from(injById.values()) };
}

async function aggregateAndValidate(fileIds, shouldStop) {
    const aggregate = aggregateRoomQuests();
    const resultsMap = new Map();
    const activeFiles = Object.keys(S.gameState.files || FILES || {}).filter(fileId => FILES[fileId]);
    const filesToValidate = (fileIds || activeFiles).filter(fileId => FILES[fileId]).map(fileId => {
        const sourceFile = (S.gameState.files && S.gameState.files[fileId]) || FILES[fileId];
        return { id: fileId, icon: sourceFile && sourceFile.icon, lang: sourceFile && sourceFile.lang || 'javascript', content: sourceFile && sourceFile.content || '' };
    });
    for (const file of filesToValidate) {
        if (shouldStop && shouldStop()) return Object.fromEntries(resultsMap);
        const devQuests = aggregate.devQuests.filter(task => {
            const target = task.targetFile || task.fileName || task.fileId;
            return target === file.id;
        });
        const injQuests = aggregate.injQuests.filter(task => {
            const target = task.targetFile || task.fileName || task.fileId;
            return target === file.id;
        });
        S.executionStatusText = 'Đang chấm file ' + file.id + '...';
        scheduleValidationRender();
        updateSpecificExecutionUI(file.id, { fileId: file.id, icon: file.icon, lang: file.lang, status: 'running', devPassed: 0, devTotal: devQuests.length, injPassed: 0, injTotal: injQuests.length, corrupted: false });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!devQuests.length && !injQuests.length) {
            const result = { fileId: file.id, icon: file.icon, lang: file.lang, success: false, output: '', stderr: 'No code to validate', status: 'skipped', corrupted: false, devPassed: 0, devTotal: 0, injPassed: 0, injTotal: 0, debugLines: [] };
            resultsMap.set(file.id, result);
            updateSpecificExecutionUI(file.id, result);
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
        }
        const tasksForRuntime = [...devQuests, ...injQuests];
        const testInput = tasksForRuntime.map(getTaskExpectedOutput).filter(Boolean).join('\n');
        const testedCode = injectHostTest(file.content, file.lang, tasksForRuntime);
        let piston;
        try {
            piston = await fetchPiston(file.lang, testedCode, testInput, file.id);
            if (piston.busy) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                piston = await fetchPiston(file.lang, testedCode, testInput, file.id);
            }
        } catch (err) {
            piston = { stdout: '', stderr: err.message, success: false };
        }
        const stdout = cleanValidationText(piston.stdout);
        const stderr = cleanValidationText(piston.stderr);
        const isServerBusy = piston && (piston.busy || stderr === 'Server Busy');
        const devPassedTasks = isServerBusy ? [] : devQuests.filter(task => validateTaskStrict(file.content, stdout, task));
        for (const task of devQuests) setTaskValidationStatus(task.id, devPassedTasks.some(t => t.id === task.id) ? 'success' : 'fail', 'developer');
        const activeInjQuests = injQuests.filter(task => task && task.done);
        const injPassedTasks = isServerBusy ? [] : activeInjQuests.filter(task => validateTaskStrict(file.content, stdout, task));
        for (const task of injQuests) setTaskValidationStatus(task.id, injPassedTasks.some(t => t.id === task.id) ? 'success' : 'fail', 'injector');
        const integrity = isServerBusy ? { corrupted: false, lines: [] } : verifyFileIntegrity(file.id, file.content, { injTasks: activeInjQuests }, { stdout });
        const devPassed = devPassedTasks.length;
        const injPassed = injPassedTasks.length;
        const sabotaged = injPassed > 0 || integrity.corrupted;
        const success = !isServerBusy && devQuests.length > 0 && devPassed === devQuests.length && !stderr && !sabotaged;
        const finalStderr = sabotaged ? stderr || 'Injector quest triggered' : stderr;
        const resultStatus = isServerBusy ? 'busy' : sabotaged ? 'sabotaged' : success ? 'ok' : 'failed';
        const result = {
            fileId: file.id,
            icon: file.icon,
            lang: file.lang,
            success,
            output: stdout,
            stderr: finalStderr,
            status: resultStatus,
            corrupted: sabotaged,
            devPassed,
            devTotal: devQuests.length,
            injPassed,
            injTotal: injQuests.length,
            explanation: finalStderr || '',
            debugLines: integrity.lines,
        };
        resultsMap.set(file.id, result);
        updateSpecificExecutionUI(file.id, result);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return Object.fromEntries(resultsMap);
}

async function validateAllFiles(fileIds, shouldStop) {
    return aggregateAndValidate(fileIds, shouldStop);
}

async function processAllFilesSync(fileIds, shouldStop) {
    return validateAllFiles(fileIds, shouldStop);
}

async function bruteForceHostValidateAll() {
    if (!S.isHost) return;
    _validationLockActive = true;
    _isValidationFinished = false;
    S.validationRunning = true;
    S.waitingForHostResult = true;
    S.codeLocked = true;
    S.globalValidationResults = buildValidationShell('running');
    S.executionStatusText = 'Host AI review đang chạy...';
    scheduleValidationRender();
    await waitForHostSubmissions();

    const files = clonePlain((S.gameState && S.gameState.files) || FILES || {});
    const fileIds = Object.keys(files);
    const initialFiles = Object.fromEntries(fileIds.map(fileId => {
        const devTasks = clonePlain((TASKS_DEVELOPER && TASKS_DEVELOPER[fileId]) || []);
        const injTasks = clonePlain((TASKS_INJECTOR && TASKS_INJECTOR[fileId]) || []);
        return [fileId, {
            fileId,
            icon: files[fileId] && files[fileId].icon,
            lang: files[fileId] && files[fileId].lang,
            status: devTasks.length ? 'reviewing' : 'no_tasks',
            corrupted: false,
            success: false,
            output: '',
            stderr: '',
            devPassed: 0,
            devTotal: devTasks.length,
            injPassed: 0,
            injTotal: injTasks.length,
            explanation: '',
            source: 'pending_review',
        }];
    }));
    S.globalValidationResults.files = initialFiles;
    S.globalValidationResults.status = 'reviewing';

    const currentReviewFileId = S.currentFile || fileIds[0] || null;
    const currentReviewTarget = {
        fileId: currentReviewFileId,
        result: clonePlain((S.globalValidationResults.files || {})[currentReviewFileId] || {}),
        developerTasks: clonePlain((TASKS_DEVELOPER && TASKS_DEVELOPER[currentReviewFileId]) || []),
        injectorTasks: clonePlain((TASKS_INJECTOR && TASKS_INJECTOR[currentReviewFileId]) || []),
    };
    const roomSnapshot = {
        currentFile: S.currentFile,
        files,
        results: clonePlain(S.globalValidationResults.files || {}),
        developerTasks: clonePlain(TASKS_DEVELOPER || {}),
        injectorTasks: clonePlain(TASKS_INJECTOR || {}),
        taskValidation: clonePlain((S.gameState && S.gameState.taskValidation) || {}),
        currentReviewTarget,
        players: clonePlain(S.players || []),
        round: S.currentRound,
    };

    const geminiReview = await fetchGeminiMeetingReview(roomSnapshot);
    if (geminiReview && geminiReview.files) {
        Object.keys(geminiReview.files).forEach(fileId => {
            const previous = S.globalValidationResults.files[fileId] || {};
            const reviewed = geminiReview.files[fileId] || {};
            const status = reviewed.status || previous.status;
            const isNormal = status === 'normal';
            const isInjected = status === 'injected';
            const devTotal = Number.isFinite(reviewed.totalQuests) ? reviewed.totalQuests : previous.devTotal || 0;
            S.globalValidationResults.files[fileId] = {
                ...previous,
                ...reviewed,
                success: isNormal,
                corrupted: typeof reviewed.corrupted === 'boolean' ? reviewed.corrupted : isInjected,
                devPassed: isNormal ? devTotal : 0,
                devTotal,
                explanation: reviewed.reason || reviewed.explanation || previous.explanation || '',
                source: reviewed.source || geminiReview.source || 'gemini',
            };
        });
    }

    const reviewUnavailableExplanation = 'Host AI review unavailable.';
    const refreshedReview = summarizeCurrentFileReview(S.globalValidationResults);
    const mergedReview = geminiReview && geminiReview.currentReview ? {
        fileId: geminiReview.currentReview.fileId || refreshedReview.fileId,
        done: typeof geminiReview.currentReview.done === 'boolean' ? geminiReview.currentReview.done : refreshedReview.done,
        completedQuests: Number.isFinite(geminiReview.currentReview.completedQuests) ? geminiReview.currentReview.completedQuests : refreshedReview.completedQuests,
        totalQuests: Number.isFinite(geminiReview.currentReview.totalQuests) ? geminiReview.currentReview.totalQuests : refreshedReview.totalQuests,
        status: geminiReview.currentReview.status || refreshedReview.status,
        explanation: geminiReview.currentReview.reason || geminiReview.currentReview.explanation || '',
        source: geminiReview.currentReview.source || geminiReview.source || 'gemini',
    } : geminiReview ? {
        fileId: geminiReview.fileId || refreshedReview.fileId,
        done: typeof geminiReview.done === 'boolean' ? geminiReview.done : refreshedReview.done,
        completedQuests: Number.isFinite(geminiReview.completedQuests) ? geminiReview.completedQuests : refreshedReview.completedQuests,
        totalQuests: Number.isFinite(geminiReview.totalQuests) ? geminiReview.totalQuests : refreshedReview.totalQuests,
        status: geminiReview.status || refreshedReview.status,
        explanation: geminiReview.reason || geminiReview.explanation || '',
        source: geminiReview.source || 'gemini',
    } : {
        ...refreshedReview,
        explanation: refreshedReview.explanation || reviewUnavailableExplanation,
        source: 'host_validation',
    };

    if ((mergedReview.status === 'normal' || mergedReview.status === 'injected') && typeof mergedReview.done !== 'boolean') {
        mergedReview.done = mergedReview.status === 'normal';
    }
    recalculateGlobalProgress();
    S.globalValidationResults.status = 'complete';
    S.globalValidationResults.globalProgress = S.gameState.globalProgress || 0;
    S.globalValidationResults.sabotageProgress = S.gameState.sabotageProgress || 0;
    S.currentMeetingReview = mergedReview;
    S.globalValidationResults.currentReview = mergedReview;
    S.globalValidationResults.geminiReviewError = S.geminiReviewError || '';
    S.validationRunning = false;
    S.waitingForHostResult = false;
    S.codeLocked = false;
    _isValidationFinished = true;
    S.executionStatusText = 'Host chấm bài hoàn tất.';
    if (typeof sendToAll === 'function') sendToAll({ type: 'FINAL_VALIDATION_SYNC', results: S.globalValidationResults, gameState: exportGameState(), statusText: S.executionStatusText });
    holdFinalValidationScreen(10);
}

// ── State for execute screen ──────────────────────────────────
let _executeTimer    = null;
let _executeResults  = null;
let _validationHoldTimer = null;
let _validationRenderRaf = null;
let _lastValidationBroadcast = 0;
let _executionUiRaf = null;
let _pendingExecutionUiData = null;

function scheduleValidationRender() {
    if (document.getElementById('executing-overlay')) {
        updateExecutionUI({ statusText: S.executionStatusText, results: S.globalValidationResults });
        return;
    }
    if (_validationRenderRaf) return;
    _validationRenderRaf = requestAnimationFrame(() => {
        _validationRenderRaf = null;
        render();
    });
}

function updateExecutionUI(data) {
    _pendingExecutionUiData = data || {};
    if (_executionUiRaf) return;
    _executionUiRaf = requestAnimationFrame(() => {
        _executionUiRaf = null;
        const payload = _pendingExecutionUiData || {};
        _pendingExecutionUiData = null;
        const overlay = document.getElementById('executing-overlay');
        if (!overlay) return;
        const resultPack = payload.results || S.globalValidationResults || {};
        const results = resultPack.files || resultPack;
        const statusEl = document.getElementById('exec-status-text');
        if (statusEl) statusEl.textContent = payload.statusText || S.executionStatusText || '';
        const prog = resultPack.globalProgress || S.gameState.globalProgress || S.taskProgress || 0;
        const sabotage = resultPack.sabotageProgress || S.gameState.sabotageProgress || 0;
        const summaryEl = document.getElementById('exec-progress-summary');
        if (summaryEl) summaryEl.textContent = 'D ' + prog + '% · I ' + sabotage + '%';
        const devBar = document.getElementById('exec-dev-progress');
        const injBar = document.getElementById('exec-inj-progress');
        if (devBar) devBar.style.width = prog + '%';
        if (injBar) injBar.style.width = sabotage + '%';
        Object.keys(results || {}).forEach(fileId => updateSpecificExecutionUI(fileId, results[fileId] || {}));
    });
}

function updateSpecificExecutionUI(fileId, r) {
    const row = document.getElementById('exec-file-' + cssEscapeId(fileId));
    if (!row) return;
    const ok = r.status === 'ok' || ((r.devPassed || r.devDone || 0) > 0 && r.status !== 'no_tasks' && !r.corrupted);
    const bad = r.corrupted || r.status === 'sabotaged' || r.status === 'error' || r.status === 'failed';
    const skipped = r.status === 'skipped';
    Object.assign(row.style, {
        background: skipped ? 'rgba(133,133,133,0.1)' : bad ? 'rgba(239,68,68,0.1)' : ok ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
        borderColor: skipped ? '#555' : bad ? '#ef444444' : ok ? '#22c55e44' : '#333',
    });
    const icon = row.querySelector('[data-exec-icon]');
    const text = row.querySelector('[data-exec-text]');
    const term = row.querySelector('[data-exec-term]');
    const global = row.querySelector('[data-exec-global]');
    const sabotageLine = row.querySelector('[data-exec-sabotage]');
    if (icon) icon.textContent = skipped ? '⏭️' : bad ? '❌' : ok ? '✅' : S.validationRunning ? '⏳' : '•';
    if (text) text.textContent = skipped ? 'Server Busy - Skipped' : r.status === 'no_tasks' ? 'No tasks assigned' : (bad ? 'FILE CORRUPTED / SABOTAGED — ' : '') + (r.devPassed || r.devDone || 0) + '/' + (r.devTotal || 0) + ' Quests Completed';
    if (global) global.textContent = fileId + ': ' + (r.devPassed || r.devDone || 0) + '/' + (r.devTotal || 0) + ' Quests Completed';
    if (sabotageLine) sabotageLine.textContent = r.corrupted ? 'FILE CORRUPTED / SABOTAGED' : '';
    if (term) writeExecutionLog(term, fileId, r);
}

function writeExecutionLog(term, fileId, r) {
    term.textContent = '';
    const lines = [
        '$ validated ' + fileId,
        r.status === 'skipped' ? 'Server Busy - Skipped' : r.status === 'no_tasks' ? 'No tasks assigned' : 'Developer quests: ' + (r.devPassed || 0) + '/' + (r.devTotal || 0),
    ];
    if ((r.injPassed || 0) > 0) lines.push('Sabotage quests: ' + r.injPassed + '/' + r.injTotal);
    (r.debugLines || []).forEach(line => lines.push(String(line)));
    if (r.stderr) lines.push(String(r.stderr));
    for (const line of lines) {
        const div = document.createElement('div');
        div.textContent = line;
        if (line.indexOf('Sabotage') >= 0 || line.indexOf('Server Busy') >= 0 || line.indexOf('Skipped') >= 0 || line.indexOf('No tasks') >= 0) div.style.color = '#ef4444';
        else if (line.indexOf('$ validated') === 0) div.style.color = r.corrupted ? '#ef4444' : '#22c55e';
        else div.style.color = '#858585';
        term.appendChild(div);
    }
}

function cssEscapeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function broadcastValidationStatus(statusText, results, force) {
    S.executionStatusText = statusText;
    const now = performance.now();
    if (force || now - _lastValidationBroadcast >= 100) {
        _lastValidationBroadcast = now;
        if (typeof sendToAll === 'function') sendToAll({ type: 'EXECUTION_STATUS_SYNC', statusText, results });
    }
    scheduleValidationRender();
}

/**
 * Khởi động màn hình Execute Code.
 * Gọi thay vì vào meeting trực tiếp.
 * @param {Function} afterCallback  — gọi khi màn hình kết thúc (→ meeting)
 */
function startExecuteScreen(afterCallback) {
    if (S.showExecuteScreen) {
        if (afterCallback && !S._executeAfterCb) S._executeAfterCb = afterCallback;
        return;
    }
    if (_executeTimer) { clearInterval(_executeTimer); _executeTimer = null; }
    if (S._codingTimerInterval) { clearInterval(S._codingTimerInterval); S._codingTimerInterval = null; }
    S.codingTimerRunning = false;
    _executeResults = S.globalValidationResults || buildValidationShell('running');
    S.showExecuteScreen = true;
    S.executeScreenSecs = 0;
    S._executeAfterCb = afterCallback || null;
    S.validationRunning = true;
    S.waitingForHostResult = true;
    S.codeLocked = true;
    S.executionStatusText = S.executionStatusText || 'Đang chờ Host chấm bài...';
    if (!document.getElementById('executing-overlay')) render();
    else updateExecutionUI({ statusText: S.executionStatusText, results: _executeResults });
    if (typeof submitCodeToHost === 'function') submitCodeToHost();
    if (S.isHost && typeof bruteForceHostValidateAll === 'function') bruteForceHostValidateAll();
}

function holdFinalValidationScreen(seconds) {
    if (_validationHoldTimer) { clearInterval(_validationHoldTimer); _validationHoldTimer = null; }
    let left = seconds || 10;
    S.validationRunning = false;
    S.waitingForHostResult = true;
    S.codeLocked = true;
    S.showExecuteScreen = true;
    S.executionStatusText = `Họp sẽ bắt đầu sau ${left}s...`;
    if (typeof sendToAll === 'function' && S.isHost) sendToAll({ type: 'VALIDATION_HOLD_TICK', secondsLeft: left, statusText: S.executionStatusText, results: S.globalValidationResults });
    updateExecutionUI({ statusText: S.executionStatusText, results: S.globalValidationResults });
    _validationHoldTimer = setInterval(() => {
        left--;
        if (left <= 0) {
            clearInterval(_validationHoldTimer);
            _validationHoldTimer = null;
            if (typeof sendToAll === 'function' && S.isHost) sendToAll({ type: 'ENTER_MEETING_AFTER_VALIDATION' });
            finishExecuteScreenFromHost();
            return;
        }
        S.executionStatusText = `Họp sẽ bắt đầu sau ${left}s...`;
        if (typeof sendToAll === 'function' && S.isHost) sendToAll({ type: 'VALIDATION_HOLD_TICK', secondsLeft: left, statusText: S.executionStatusText, results: S.globalValidationResults });
        updateExecutionUI({ statusText: S.executionStatusText, results: S.globalValidationResults });
    }, 1000);
}

function finishExecuteScreenFromHost() {
    if (_executeTimer) { clearInterval(_executeTimer); _executeTimer = null; }
    if (_validationHoldTimer) { clearInterval(_validationHoldTimer); _validationHoldTimer = null; }
    const cb = S._executeAfterCb;
    const overlay = document.getElementById('executing-overlay');
    const close = () => {
        S.showExecuteScreen = false;
        S.validationRunning = false;
        S.waitingForHostResult = false;
        S.codeLocked = false;
        S._executeAfterCb = null;
        _validationLockActive = false;
        _isValidationFinished = false;
        render();
        if (cb) cb();
    };
    if (overlay) {
        overlay.style.transition = 'opacity 180ms ease, transform 180ms ease';
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateZ(0) scale(0.99)';
        setTimeout(close, 190);
    } else {
        close();
    }
}

/**
 * Người dùng bấm "Skip" — bỏ qua màn hình execute sớm.
 */
function skipExecuteScreen() {
    if (S.waitingForHostResult || S.validationRunning) {
        notify('Đang chờ Host chấm bài, chưa thể bỏ qua.', true);
        return;
    }
    finishExecuteScreenFromHost();
}

async function executeCode(fileName) {
    const fn = fileName || S.currentFile;
    const fi = FILES[fn];
    if (!fi) return;

    const runtime = PISTON_RUNTIME[fi.lang];
    if (!runtime) {
        S.terminalOutput = `> ${fn}\nUnsupported runtime: ${fi.lang}`;
        S.showTerminal = true;
        render();
        return;
    }

    S.terminalOutput = `> ${fn}\nRunning ${runtime.language} ${runtime.version} on Piston...`;
    S.showTerminal = true;
    render();

    try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: runtime.language,
                version: runtime.version,
                files: [{ name: fn, content: fi.content || '' }],
                stdin: '',
                args: [],
                compile_timeout: 10000,
                run_timeout: 3000,
                compile_memory_limit: -1,
                run_memory_limit: -1,
            }),
        });

        if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);
        const result = await res.json();
        const compileOut = [result.compile && result.compile.stdout, result.compile && result.compile.stderr].filter(Boolean).join('\n');
        const runOut = [result.run && result.run.stdout, result.run && result.run.stderr].filter(Boolean).join('\n');
        const output = (runOut || compileOut || '').trim();
        const code = result.run ? result.run.code : result.compile && result.compile.code;

        S.terminalOutput = `> ${fn}\n${compileOut ? compileOut + '\n' : ''}${runOut || '(no output)'}\n\nProcess exited with code ${code}\nVerified tasks: Host validation only`;
    } catch (err) {
        S.terminalOutput = `> ${fn}\nPiston execution failed: ${err.message}`;
    }

    S.showTerminal = true;
    render();
}

function validateQuestsForOutput(fn, output) {
    return;
}

function getQuestExpectedOutput(fn) {
    const tasks = (S.tasks && S.tasks[fn]) || [];
    const explicit = tasks.map(t => t.expectedOutput || t.expected || t.output).find(Boolean);
    if (explicit) return explicit;
    const text = tasks.map(t => t.label || '').join('\n');
    const quoted = text.match(/[“\"]([^”\"]+)[”\"]/);
    if (quoted) return quoted[1];
    if (/hello world/i.test(text)) return 'Hello World';
    return null;
}

// ── Render ────────────────────────────────────────────────────
function renderExecuteScreen() {
    const globalResults = S.globalValidationResults || _executeResults;
    if (!S.showExecuteScreen || !globalResults) return '';

    const results = globalResults.files || globalResults;
    const statusText = S.executionStatusText || (S.validationRunning ? 'Đang chờ Host chấm bài...' : 'Chấm bài hoàn tất.');

    const fileRows = Object.keys(results).map(fn => {
        const r = results[fn];
        let statusIcon, statusColor, statusText, bgColor, borderColor;

        if (r.status === 'no_tasks') {
            statusIcon  = '•';
            statusColor = '#858585';
            statusText  = 'No tasks assigned';
            bgColor     = 'rgba(255,255,255,0.02)';
            borderColor = '#333';
        } else if (r.corrupted || r.status === 'sabotaged' || r.status === 'error' || r.status === 'failed') {
            statusIcon  = '❌';
            statusColor = '#ef4444';
            statusText  = `FILE CORRUPTED / SABOTAGED — ${r.devPassed || 0}/${r.devTotal || 0} Quests Completed`;
            bgColor     = 'rgba(239,68,68,0.1)';
            borderColor = '#ef444444';
        } else if (r.status === 'ok' || (r.devPassed || r.devDone || 0) > 0) {
            statusIcon  = '✅';
            statusColor = '#22c55e';
            statusText  = `${r.devPassed || r.devDone || 0}/${r.devTotal || 0} Quests Completed`;
            bgColor     = 'rgba(34,197,94,0.08)';
            borderColor = '#22c55e44';
        } else if (r.status === 'skipped') {
            statusIcon  = '⏭️';
            statusColor = '#858585';
            statusText  = 'Server Busy - Skipped';
            bgColor     = 'rgba(133,133,133,0.1)';
            borderColor = '#555';
        } else {
            statusIcon  = S.validationRunning ? '⏳' : '•';
            statusColor = '#858585';
            statusText  = `${r.devPassed || r.devDone || 0}/${r.devTotal || 0} Quests Completed`;
            bgColor     = 'rgba(255,255,255,0.02)';
            borderColor = '#333';
        }

        const termLines = generateGlobalOutput(fn, r);

        return `
        <div id="exec-file-${cssEscapeId(fn)}" data-file-id="${String(fn).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;
            padding:12px 16px;margin-bottom:10px;will-change:transform;transform:translateZ(0);backface-visibility:hidden;contain:paint;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <span style="font-size:18px;">${r.icon}</span>
                <span style="font-size:13px;color:#d4d4d4;font-weight:600;flex:1;">${fn}</span>
                <span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;">${r.lang}</span>
                <span data-exec-icon style="font-size:16px;">${statusIcon}</span>
                <span data-exec-text style="font-size:11px;color:${statusColor};font-weight:500;">${statusText}</span>
            </div>

            <div style="background:#0d0d0d;border-radius:6px;padding:8px 10px;margin-bottom:8px;">
                <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Global Result</div>
                <div data-exec-global style="font-size:11px;color:${statusColor};font-family:'JetBrains Mono',monospace;">${fn}: ${r.devPassed || r.devDone || 0}/${r.devTotal || 0} Quests Completed</div>
                <div data-exec-sabotage style="font-size:10px;color:#ef4444;margin-top:4px;font-weight:700;">${r.corrupted ? 'FILE CORRUPTED / SABOTAGED' : ''}</div>
            </div>

            <div data-exec-term style="background:#0d0d0d;border-radius:6px;padding:6px 10px;
                font-family:'JetBrains Mono',monospace;font-size:10px;color:#858585;
                line-height:1.6;">
                ${termLines}
            </div>
        </div>`;
    }).join('');

    // Progress summary
    const prog = globalResults.globalProgress || S.gameState.globalProgress || S.taskProgress || 0;
    const sabotage = globalResults.sabotageProgress || S.gameState.sabotageProgress || 0;
    const progColor = prog >= 80 ? '#22c55e' : prog >= 40 ? '#f59e0b' : '#ef4444';

    return `
    <div id="executing-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.96);z-index:5000;
        display:flex;align-items:center;justify-content:center;contain:layout paint;
        will-change:transform;transform:translateZ(0);backface-visibility:hidden;">

        <div style="width:640px;max-width:95vw;max-height:90vh;overflow-y:auto;
            background:#141414;border:1px solid #333;border-radius:16px;
            padding:24px;box-shadow:${S.isHost && S.validationRunning ? 'none' : '0 24px 80px rgba(0,0,0,0.8)'};
            transform:translateZ(0);will-change:transform;contain:content;">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <div style="font-size:22px;">⚡</div>
                <div style="flex:1;">
                    <div style="font-size:16px;color:#d4d4d4;font-weight:700;
                        font-family:'JetBrains Mono',monospace;">
                        Executing Code...
                    </div>
                    <div id="exec-status-text" style="font-size:11px;color:#555;margin-top:2px;">
                        ${statusText}
                    </div>
                </div>
                <div style="width:56px;height:56px;border-radius:50%;
                    border:3px solid #f59e0b;display:flex;align-items:center;
                    justify-content:center;flex-direction:column;
                    box-shadow:0 0 20px #f59e0b44;">
                    <div id="exec-countdown"
                        style="font-size:11px;color:#f59e0b;font-weight:700;
                        font-family:'JetBrains Mono',monospace;line-height:1;text-align:center;">
                        HOST
                    </div>
                </div>
            </div>

            <div style="margin-bottom:16px;">
                ${fileRows}
            </div>

            <div style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;
                padding:12px 16px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:8px;">
                    <span style="font-size:11px;color:#858585;">Global Progress</span>
                    <span id="exec-progress-summary" style="font-size:13px;color:${progColor};font-weight:700;
                        font-family:'JetBrains Mono',monospace;">D ${prog}% · I ${sabotage}%</span>
                </div>
                <div style="height:14px;background:#252526;border-radius:4px;overflow:hidden;">
                    <div id="exec-dev-progress" style="height:7px;width:${prog}%;background:#22c55e;transform:translateZ(0);backface-visibility:hidden;"></div>
                    <div id="exec-inj-progress" style="height:7px;width:${sabotage}%;background:#ef4444;transform:translateZ(0);backface-visibility:hidden;"></div>
                </div>
                ${prog >= 100 ? `<div style="font-size:10px;color:#22c55e;margin-top:6px;">
                    🎉 Developers đã hoàn thành toàn bộ task!</div>` : ''}
            </div>

            ${(() => {
                const review = globalResults.currentReview || S.currentMeetingReview;
                if (!review) return '';
                const accent = review.done ? '#22c55e' : '#ef4444';
                const label = review.done ? 'DONE' : 'NOT DONE';
                return `<div style="background:#161616;border:1px solid ${accent}44;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                        <div>
                            <div style="font-size:10px;color:#858585;text-transform:uppercase;letter-spacing:0.08em;">Current file</div>
                            <div style="font-size:13px;color:#d4d4d4;font-weight:700;margin-top:4px;">${review.fileId || S.currentFile}</div>
                        </div>
                        <div style="font-size:12px;color:${accent};font-weight:800;letter-spacing:0.08em;">${label}</div>
                    </div>
                    <div style="font-size:12px;color:${accent};font-weight:600;margin-top:8px;">${review.completedQuests || 0}/${review.totalQuests || 0} quests finished</div>
                    ${review.explanation ? `<div style="font-size:10px;color:#858585;margin-top:6px;">${review.explanation}</div>` : ''}
                </div>`;
            })()}

            <div style="text-align:center;">

            <div style="text-align:center;">
                <button onclick="skipExecuteScreen()"
                    style="background:#252526;color:#858585;border:1px solid #333;
                    border-radius:8px;padding:8px 24px;font-size:11px;cursor:pointer;
                    font-family:'JetBrains Mono',monospace;
                    transition:background 0.15s,color 0.15s;"
                    onmouseover="this.style.background='#2d2d2d';this.style.color='#ccc'"
                    onmouseout="this.style.background='#252526';this.style.color='#858585'">
                    Chờ Host hoàn tất
                </button>
            </div>
        </div>
    </div>`;
}

/**
 * Tạo output giả lập dòng terminal cho mỗi file
 */
function generateGlobalOutput(fn, r) {
    if (r.status === 'running') return `<span style="color:#f59e0b;">$ validating ${fn}...</span>`;
    const lines = [];
    lines.push(`<span style="color:${r.corrupted ? '#ef4444' : '#22c55e'};">$ validated ${fn}</span>`);
    if (r.status === 'no_tasks') lines.push(`<span style="color:#858585;">No tasks assigned</span>`);
    else lines.push(`<span style="color:#858585;">Developer quests: ${r.devPassed || 0}/${r.devTotal || 0}</span>`);
    if ((r.injPassed || 0) > 0) lines.push(`<span style="color:#ef4444;">Sabotage quests: ${r.injPassed}/${r.injTotal}</span>`);
    if (r.stderr) lines.push(`<span style="color:#ef4444;">${String(r.stderr).replace(/</g, '&lt;')}</span>`);
    return lines.join('<br>');
}

function generateFakeOutput(fn, r) {
    const lang = r.lang;
    let lines = [];

    if (r.status === 'ok') {
        lines = [
            `<span style="color:#22c55e;">$ run ${fn}</span>`,
            `<span style="color:#6a9955;">✓ Compiled ${lang} — no errors</span>`,
            `<span style="color:#858585;">Output: Process exited with code 0</span>`,
        ];
    } else if (r.status === 'error') {
        lines = [
            `<span style="color:#ef4444;">$ run ${fn}</span>`,
            `<span style="color:#ef4444;">✗ RuntimeError: Unexpected behavior detected</span>`,
            `<span style="color:#f59e0b;">⚠ File integrity compromised — progress blocked</span>`,
        ];
    } else {
        lines = [
            `<span style="color:#555;">$ run ${fn}</span>`,
            `<span style="color:#555;">— No tasks completed for this file</span>`,
        ];
    }

    return lines.join('<br>');
}
