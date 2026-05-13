const express = require('express');
const { RoomManager } = require('./state/room-manager');
const { createRoomsRouter } = require('./routes/rooms');

function createApp() {
  const app = express();
  const roomManager = new RoomManager();

  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (_req, res) => {
    res.json({ ok: true, mode: 'deterministic', executor: 'docker-stub' });
  });
  app.use('/api/rooms', createRoomsRouter(roomManager));

  return { app, roomManager };
}

module.exports = {
  createApp
};

if (require.main === module) {
  const host = process.env.DETERMINISTIC_SERVER_HOST || '127.0.0.1';
  const port = Number(process.env.DETERMINISTIC_SERVER_PORT || 8790);
  const { app } = createApp();
  app.listen(port, host, () => {
    console.log(`Deterministic server listening on http://${host}:${port}`);
  });
}