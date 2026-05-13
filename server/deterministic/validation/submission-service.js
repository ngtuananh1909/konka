const { executeInDocker } = require('./docker-executor');
const { normalizeRoomResults } = require('./quest-verifier');

async function validateRoomSubmission(room) {
  const executionResults = {};
  for (const [fileId, file] of Object.entries(room.files || {})) {
    executionResults[fileId] = await executeInDocker({ fileId, file, language: file.language || room.language });
  }
  return normalizeRoomResults(room, executionResults);
}

module.exports = {
  validateRoomSubmission
};