const db = require('./config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  static async create(userData) {
    const { email, password, firstName, lastName } = userData;
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, first_name, last_name, created_at, is_active, email_verified
    `;
    
    try {
      const result = await db.query(query, [email, passwordHash, firstName, lastName]);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, 
             created_at, updated_at, last_login, is_active, email_verified
      FROM users 
      WHERE email = $1 AND is_active = true
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, 
             created_at, updated_at, last_login, is_active, email_verified
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateLastLogin(id) {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING last_login
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0].last_login;
  }

  static async updatePassword(id, newPassword) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    
    await db.query(query, [passwordHash, id]);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async createRefreshToken(userId, expiresAt) {
    const token = crypto.randomBytes(64).toString('base64url');
    const tokenHash = User.hashRefreshToken(token);
    
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, expires_at
    `;
    
    const result = await db.query(query, [userId, tokenHash, expiresAt]);
    return { token, ...result.rows[0] };
  }

  static hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async findRefreshToken(token) {
    const query = `
      SELECT rt.*, u.email, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = $1 AND rt.is_revoked = false AND rt.expires_at > CURRENT_TIMESTAMP
    `;
    
    const tokenHash = User.hashRefreshToken(token);
    const result = await db.query(query, [tokenHash]);
    return result.rows[0];
  }

  static async revokeRefreshToken(tokenId) {
    const query = `
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE id = $1
    `;
    
    await db.query(query, [tokenId]);
  }

  static async revokeRefreshTokenByToken(token) {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE token_hash = $1
    `;

    await db.query(query, [User.hashRefreshToken(token)]);
  }

  static async revokeAllUserTokens(userId) {
    const query = `
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE user_id = $1 AND is_revoked = false
    `;
    
    await db.query(query, [userId]);
  }
}

module.exports = User;
