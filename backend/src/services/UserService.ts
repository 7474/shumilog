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
      INSERT INTO users (id, twitter_username, display_name, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    await stmt.run([
      userId,
      data.twitter_username || null,
      data.display_name,
      data.avatar_url || null,
      now
    ]);

    return {
      id: userId,
      twitter_username: data.twitter_username,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      created_at: now
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db.queryFirst(
      'SELECT id, twitter_username, display_name, avatar_url, created_at FROM users WHERE id = ?',
      [id]
    );
    
    return row ? UserModel.fromRow(row) : null;
  }

  /**
   * Find user by Twitter ID
   */
  async findByTwitterId(twitterId: string): Promise<User | null> {
    const row = await this.db.queryFirst(
      'SELECT id, twitter_username, display_name, avatar_url, created_at FROM users WHERE twitter_id = ?',
      [twitterId]
    );
    
    return row ? UserModel.fromRow(row) : null;
  }

  /**
   * Find user by Twitter username
   */
  async findByTwitterUsername(username: string): Promise<User | null> {
    const row = await this.db.queryFirst(
      'SELECT id, twitter_username, display_name, avatar_url, created_at FROM users WHERE twitter_username = ?',
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
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
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
}