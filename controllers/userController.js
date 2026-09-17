import { UserService } from '../services/userService.js';

export class UserController {
  static async checkUsername(req, res) {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ valid: false, message: 'Username is required' });
    }
    const result = await UserService.checkUsernameAvailability(username);
    return res.json(result);
  }

  static async signUp(req, res) {
    const { fullName, username, password, avatar } = req.body;
    if (!fullName || !username || !password) {
      return res.status(400).json({ error: 'Full name, username, and password are required' });
    }
    if (username.trim().length < 5) {
      return res.status(400).json({ error: 'Username must be at least 5 characters long' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
      const result = await UserService.signUpUser({ fullName, username, password, avatar });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Sign up failed' });
    }
  }

  static async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const result = await UserService.loginUser({ username, password });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(401).json({ error: err.message || 'Invalid credentials' });
    }
  }

  static async updateProfile(req, res) {
    const userId = req.user?.id || req.body.userId;
    const { fullName, avatar, password } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized profile update' });
    }

    try {
      const updatedUser = await UserService.updateProfile(userId, { fullName, avatar, password });
      return res.json({ success: true, user: updatedUser });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  static async getRegisteredUsers(req, res) {
    const currentUserId = req.user?.id || req.query.currentUserId;
    const contacts = await UserService.getRegisteredUsers(currentUserId);
    return res.json(contacts);
  }
}
