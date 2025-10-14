import { User, UserModel, CreateUserData, UpdateUserData } from '../models/User.js';
import { Database } from '../db/database.js';

export class UserService {
  constructor(private db: Database) {}

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, twitter_username, display_name, avatar_url, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.run([
      userId,
      data.twitter_username || null,
      data.display_name,
      data.avatar_url || null,
      'user', // Default role
      now
    ]);

    return {
      id: userId,
      twitter_username: data.twitter_username,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      role: 'user',
      created_at: now
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db.queryFirst(
      'SELECT id, twitter_username, display_name, avatar_url, role, created_at FROM users WHERE id = ?',
      [id]
    );
    
    return row ? UserModel.fromRow(row) : null;
  }

  /**
   * Find user by Twitter username (since no twitter_id field in minimal schema)
   */
  async findByTwitterId(twitterUsername: string): Promise<User | null> {
    return await this.findByTwitterUsername(twitterUsername);
  }

  /**
   * Find user by Twitter username
   */
  async findByTwitterUsername(username: string): Promise<User | null> {
    const row = await this.db.queryFirst(
      'SELECT id, twitter_username, display_name, avatar_url, role, created_at FROM users WHERE twitter_username = ?',
      [username]
    );
    
    return row ? UserModel.fromRow(row) : null;
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(data.display_name);
    }
    
    if (data.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(data.avatar_url);
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    params.push(userId);
    
    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    await stmt.run(params);
    
    // Return updated user
    const updatedUser = await this.findById(userId);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }
    
    return updatedUser;
  }

  /**
   * Find or create user during OAuth callback
   * Creates user if missing, updates profile if exists
   */
  async findOrCreateUserByTwitter(twitterData: {
    twitter_username: string;
    display_name: string;
    avatar_url?: string;
  }): Promise<User> {
    // First try to find by Twitter username
    let user = await this.findByTwitterUsername(twitterData.twitter_username);
    
    if (user) {
      // Update existing user with latest Twitter data
      return await this.updateUser(user.id, {
        display_name: twitterData.display_name,
        avatar_url: twitterData.avatar_url
      });
    }
    
    // Create new user
    return await this.createUser({
      twitter_username: twitterData.twitter_username,
      display_name: twitterData.display_name,
      avatar_url: twitterData.avatar_url
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalLogs: number;
    totalTags: number;
    recentLogsCount: number;
  }> {
    // Get total logs count
    const logsResult = await this.db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM logs WHERE user_id = ?',
      [userId]
    );
    
    // Get unique tags count used by user
    const tagsResult = await this.db.queryFirst<{ count: number }>(
      `SELECT COUNT(DISTINCT lta.tag_id) as count 
       FROM log_tag_associations lta 
       JOIN logs l ON l.id = lta.log_id 
       WHERE l.user_id = ?`,
      [userId]
    );
    
    // Get recent logs count (last 7 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentResult = await this.db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND created_at >= ?',
      [userId, recentDate.toISOString()]
    );
    
    return {
      totalLogs: logsResult?.count || 0,
      totalTags: tagsResult?.count || 0,
      recentLogsCount: recentResult?.count || 0
    };
  }

  /**
   * Get user's tag statistics
   */
  async getUserTagStats(userId: string, topTagsLimit = 5): Promise<{
    totalTags: number;
    topTags: Array<{ id: string; name: string; description: string | null; count: number }>;
    recentTags: Array<{ id: string; name: string; description: string | null; lastUsed: string }>;
  }> {
    // Get total unique tags count
    const totalTagsResult = await this.db.queryFirst<{ count: number }>(
      `SELECT COUNT(DISTINCT lta.tag_id) as count 
       FROM log_tag_associations lta 
       JOIN logs l ON l.id = lta.log_id 
       WHERE l.user_id = ?`,
      [userId]
    );

    // Get top used tags
    const topTagsRows = await this.db.query<{ 
      id: string; 
      name: string; 
      description: string | null; 
      count: number 
    }>(
      `SELECT t.id, t.name, t.description, COUNT(*) as count
       FROM log_tag_associations lta
       JOIN logs l ON l.id = lta.log_id
       JOIN tags t ON lta.tag_id = t.id
       WHERE l.user_id = ?
       GROUP BY t.id, t.name, t.description
       ORDER BY count DESC, t.name ASC
       LIMIT ?`,
      [userId, topTagsLimit]
    );

    // Get recently used tags (last 7 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const recentTagsRows = await this.db.query<{
      id: string;
      name: string;
      description: string | null;
      lastUsed: string;
    }>(
      `SELECT DISTINCT t.id, t.name, t.description, MAX(l.created_at) as lastUsed
       FROM log_tag_associations lta
       JOIN logs l ON l.id = lta.log_id
       JOIN tags t ON lta.tag_id = t.id
       WHERE l.user_id = ? AND l.created_at >= ?
       GROUP BY t.id, t.name, t.description
       ORDER BY lastUsed DESC
       LIMIT ?`,
      [userId, recentDate.toISOString(), topTagsLimit]
    );

    return {
      totalTags: totalTagsResult?.count || 0,
      topTags: topTagsRows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        count: row.count
      })),
      recentTags: recentTagsRows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        lastUsed: row.lastUsed
      }))
    };
  }

  /**
   * Check if user has admin privileges
   */
  isAdmin(user: User): boolean {
    return user.role === 'admin';
  }
}