const { randomUUID } = require('node:crypto');
const { buildQuestSet } = require('../quest-templates');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom({ language, files = {} }) {
    const questSet = buildQuestSet(language);
    const roomId = randomUUID();
    const room = {
      roomId,
      phase: 'coding',
      round: 1,
      language,
      files: Object.fromEntries(Object.keys(questSet.files).map(fileId => [fileId, {
        ...questSet.files[fileId],
        content: files[fileId] || ''
      }])),
      developerTasks: questSet.developerTasks,
      injectorTasks: questSet.injectorTasks,
      submissions: {},
      validationResults: null
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  submitFiles(roomId, playerId, files) {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    room.submissions[playerId] = { ...(room.submissions[playerId] || {}), ...files };
    for (const [fileId, content] of Object.entries(files || {})) {
      if (room.files[fileId]) room.files[fileId].content = content;
    }
    return room;
  }

  saveValidationResults(roomId, results) {
    const room = this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    room.validationResults = results;
    return room;
  }
}

module.exports = {
  RoomManager
};