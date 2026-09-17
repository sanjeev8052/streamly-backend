import { ChatService } from '../services/chatService.js';

export function setupWebRTCSignaling(io) {
  const activeSockets = new Map(); // username -> socketId
  const userSocketMap = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('register-user', ({ username, userId }) => {
      if (username) {
        const clean = username.toLowerCase();
        activeSockets.set(clean, socket.id);
        if (userId) userSocketMap.set(userId, socket.id);

        socket.username = clean;
        socket.userId = userId;

        io.emit('user-status', { username: clean, userId, status: 'online' });
        console.log(`👤 User registered for WebRTC & Chat: ${clean} (${socket.id})`);
      }
    });

    // Real-Time Socket Chat Message
    socket.on('send-message', async (messagePayload) => {
      const { senderId, contactId, targetUsername, text, type, images, audioDuration } = messagePayload;

      let savedMsg;
      try {
        savedMsg = await ChatService.sendMessage({
          senderId,
          contactId,
          text,
          type,
          images,
          audioDuration
        });
      } catch (err) {
        console.error('Error saving socket message:', err.message);
      }

      const formattedMsg = {
        id: savedMsg?.id || `msg_${Date.now()}`,
        contactId,
        senderId,
        text: text || '',
        type: type || 'text',
        images,
        audioDuration,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const targetSocketId = userSocketMap.get(contactId) || (targetUsername ? activeSockets.get(targetUsername.toLowerCase()) : null);

      if (targetSocketId) {
        io.to(targetSocketId).emit('receive-message', {
          ...formattedMsg,
          sender: 'them'
        });
      }

      socket.emit('receive-message', {
        ...formattedMsg,
        sender: 'me'
      });
    });

    // Initiate Call (Caller -> Receiver)
    socket.on('call-user', ({ targetUserId, targetUsername, caller, callType }) => {
      const targetSocketId = (targetUserId && userSocketMap.get(targetUserId)) ||
                             (targetUsername && activeSockets.get(targetUsername.toLowerCase()));

      console.log(`📞 Call initiated by ${caller?.username} to target (Socket: ${targetSocketId})`);

      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming-call', {
          caller,
          callType: callType || 'video',
          callerSocketId: socket.id
        });
      } else {
        socket.emit('user-offline', { targetUsername });
      }
    });

    // Accept Call (Receiver -> Caller)
    socket.on('accept-call', ({ callerSocketId }) => {
      console.log(`✅ Call accepted by socket ${socket.id} for caller socket ${callerSocketId}`);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-accepted', { receiverSocketId: socket.id });
      }
    });

    // Decline Call (Receiver -> Caller)
    socket.on('decline-call', ({ callerSocketId }) => {
      console.log(`❌ Call declined by socket ${socket.id} for caller socket ${callerSocketId}`);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call-declined');
      }
    });

    // Cancel Call (Caller -> Receiver)
    socket.on('cancel-call', ({ targetUserId, targetUsername }) => {
      const targetSocketId = (targetUserId && userSocketMap.get(targetUserId)) ||
                             (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call-cancelled');
      }
    });

    // Relay WebRTC Offer
    socket.on('webrtc-offer', ({ targetUsername, targetUserId, targetSocketId, offer }) => {
      const destSocketId = targetSocketId ||
                           (targetUserId && userSocketMap.get(targetUserId)) ||
                           (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (destSocketId) {
        io.to(destSocketId).emit('webrtc-offer', {
          callerUsername: socket.username,
          callerSocketId: socket.id,
          offer
        });
      }
    });

    // Relay WebRTC Answer
    socket.on('webrtc-answer', ({ targetUsername, targetUserId, targetSocketId, answer }) => {
      const destSocketId = targetSocketId ||
                           (targetUserId && userSocketMap.get(targetUserId)) ||
                           (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (destSocketId) {
        io.to(destSocketId).emit('webrtc-answer', {
          answer,
          responderSocketId: socket.id
        });
      }
    });

    // Relay WebRTC ICE Candidates
    socket.on('ice-candidate', ({ targetUsername, targetUserId, targetSocketId, candidate }) => {
      const destSocketId = targetSocketId ||
                           (targetUserId && userSocketMap.get(targetUserId)) ||
                           (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (destSocketId) {
        io.to(destSocketId).emit('ice-candidate', { candidate });
      }
    });

    // Relay Media Track Toggles (camera/mic mute status)
    socket.on('toggle-media-track', ({ targetUsername, targetUserId, targetSocketId, type, isMuted }) => {
      const destSocketId = targetSocketId ||
                           (targetUserId && userSocketMap.get(targetUserId)) ||
                           (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (destSocketId) {
        io.to(destSocketId).emit('remote-media-toggled', { type, isMuted });
      }
    });

    // Relay End Call Event
    socket.on('end-call', ({ targetUsername, targetUserId, targetSocketId }) => {
      const destSocketId = targetSocketId ||
                           (targetUserId && userSocketMap.get(targetUserId)) ||
                           (targetUsername && activeSockets.get(targetUsername.toLowerCase()));
      if (destSocketId) {
        io.to(destSocketId).emit('call-ended');
      }
    });

    socket.on('disconnect', () => {
      if (socket.username) {
        activeSockets.delete(socket.username);
        if (socket.userId) userSocketMap.delete(socket.userId);
        io.emit('user-status', { username: socket.username, userId: socket.userId, status: 'offline' });
        console.log(`❌ User disconnected: ${socket.username}`);
      }
    });
  });
}
