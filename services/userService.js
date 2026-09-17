import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'streamly_secret_jwt_key_2026';

export class UserService {
  static async checkUsernameAvailability(username) {
    const clean = username.trim().toLowerCase();
    if (clean.length < 5) {
      return { valid: false, message: 'Username must be at least 5 characters long' };
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { username: clean }
      });
      if (existing) {
        return { valid: false, message: 'Username is already taken' };
      }
      return { valid: true, message: 'Username is available!' };
    } catch (err) {
      return { valid: true, message: 'Username is available!' };
    }
  }

  // User Sign Up with JWT Token & bcrypt password hashing in DB
  static async signUpUser({ fullName, username, password, avatar }) {
    const cleanUsername = username.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

    const user = await prisma.user.create({
      data: {
        fullName,
        username: cleanUsername,
        password: hashedPassword,
        avatar: defaultAvatar,
        isOnline: true
      }
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user };
  }

  // User Login with JWT Token validation from DB
  static async loginUser({ username, password }) {
    const cleanUsername = username.trim().toLowerCase();

    const dbUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (!dbUser) {
      throw new Error('User not found. Please sign up first.');
    }

    if (dbUser.password) {
      const isMatch = await bcrypt.compare(password, dbUser.password);
      if (!isMatch) {
        throw new Error('Invalid password');
      }
    }

    const token = jwt.sign(
      { id: dbUser.id, username: dbUser.username, fullName: dbUser.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: dbUser };
  }

  // Update Profile (Name, Avatar, Password) in DB
  static async updateProfile(userId, { fullName, avatar, password }) {
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (avatar) updateData.avatar = avatar;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return updated;
  }

  // Get Registered Users ONLY from Database
  static async getRegisteredUsers(currentUserId) {
    try {
      const dbUsers = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
          isOnline: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (dbUsers && dbUsers.length > 0) {
        return dbUsers
          .filter(u => u.id !== currentUserId && u.username !== currentUserId)
          .map(u => ({
            id: u.id,
            name: u.fullName,
            username: u.username,
            avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
            lastMessage: 'Registered User • Tap to Chat',
            time: 'Online',
            unreadCount: 0,
            isOnline: u.isOnline
          }));
      }
      return [];
    } catch (err) {
      return [];
    }
  }
}
