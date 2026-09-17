import { ChatService } from '../services/chatService.js';

export class ChatController {
  static async getMessages(req, res) {
    const { contactId } = req.params;
    const currentUserId = req.query.currentUserId || req.user?.id;
    const messages = await ChatService.getMessagesByContact(currentUserId, contactId);
    return res.json(messages);
  }

  static async sendMessage(req, res) {
    const { contactId, text, type, images, audioDuration, senderId } = req.body;
    const actualSenderId = senderId || req.user?.id;
    const message = await ChatService.sendMessage({
      senderId: actualSenderId,
      contactId,
      text,
      type,
      images,
      audioDuration
    });
    return res.json({ success: true, message });
  }
}
