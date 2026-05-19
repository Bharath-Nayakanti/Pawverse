const registerSocialSocket = (server) => {
  let Server;
  try {
    ({ Server } = require('socket.io'));
  } catch {
    console.warn('Socket.IO is not installed; realtime social features are running in API-only mode.');
    return null;
  }

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('social:join', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('typing:start', ({ receiverId }) => {
      if (receiverId) socket.to(`user:${receiverId}`).emit('typing:start', { senderId: socket.id });
    });
  });

  return io;
};

module.exports = { registerSocialSocket };
