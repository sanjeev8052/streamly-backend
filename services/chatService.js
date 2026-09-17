import prisma from '../config/db.js';

export class ChatService {
  static async getMessagesByContact(currentUserId, contactId) {
    try {
      const dbMessages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: contactId },
            { senderId: contactId, receiverId: currentUserId }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      if (dbMessages && dbMessages.length > 0) {
        return dbMessages.map(m => ({
          id: m.id,
          sender: m.senderId === contactId ? 'them' : 'me',
          text: m.text,
          type: m.type,
          images: m.mediaUrl ? JSON.parse(m.mediaUrl) : null,
          audioDuration: m.audioDuration,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  static async sendMessage({ senderId, contactId, text, type, images, audioDuration }) {
    try {
      let realSenderId = senderId;
      if (!realSenderId) {
        const firstUser = await prisma.user.findFirst();
        realSenderId = firstUser ? firstUser.id : null;
      } else {
        const senderExists = await prisma.user.findUnique({ where: { id: realSenderId } });
        if (!senderExists) {
          const userByUsername = await prisma.user.findUnique({ where: { username: realSenderId } });
          if (userByUsername) realSenderId = userByUsername.id;
        }
      }

      let realReceiverId = contactId;
      if (realReceiverId) {
        const receiverExists = await prisma.user.findUnique({ where: { id: realReceiverId } });
        if (!receiverExists) {
          const userByUsername = await prisma.user.findUnique({ where: { username: realReceiverId } });
          if (userByUsername) realReceiverId = userByUsername.id;
        }
      }

      if (!realSenderId || !realReceiverId) {
        return {
          id: `msg_${Date.now()}`,
          text: text || '',
          type: type || 'text',
          createdAt: new Date()
        };
      }

      const saved = await prisma.message.create({
        data: {
          senderId: realSenderId,
          receiverId: realReceiverId,
          text: text || '',
          type: type || 'text',
          audioDuration: audioDuration || null,
          mediaUrl: images ? JSON.stringify(images) : null
        }
      });
      return saved;
    } catch (err) {
      console.error('Error saving message in ChatService:', err.message);
      return {
        id: `msg_${Date.now()}`,
        text: text || '',
        type: type || 'text',
        createdAt: new Date()
      };
    }
  }
}
