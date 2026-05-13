const express = require('express');
const { validateRoomSubmission } = require('../validation/submission-service');

function createRoomsRouter(roomManager) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const language = String(req.body && req.body.language || '').toLowerCase();
    if (!language) return res.status(400).json({ error: 'language is required' });
    try {
      const room = roomManager.createRoom({ language, files: req.body.files || {} });
      return res.status(201).json(room);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  router.post('/:roomId/submissions', async (req, res) => {
    try {
      const room = roomManager.submitFiles(req.params.roomId, req.body.playerId || 'local', req.body.files || {});
      const results = await validateRoomSubmission(room);
      roomManager.saveValidationResults(req.params.roomId, results);
      return res.status(202).json(results);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  });

  router.get('/:roomId', (req, res) => {
    const room = roomManager.getRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    return res.json(room);
  });

  return router;
}

module.exports = {
  createRoomsRouter
};