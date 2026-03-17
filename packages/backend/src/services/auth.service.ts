import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { User } from '../models/types';
import { CreateUserSchema, LoginSchema } from '../models/schemas';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = 10;

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Create a new user account
 */
export async function createUser(
  username: string,
  password: string,
  email: string
): Promise<User> {
  // Validate input
  const validated = CreateUserSchema.parse({ username, password, email });

  // Hash password
  const passwordHash = await hashPassword(validated.password);

  // Insert user into database
  const query = `
    INSERT INTO users (username, password_hash, email)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at, last_login
  `;

  try {
    const result = await pool.query(query, [validated.username, passwordHash, validated.email]);
    const row = result.rows[0];

    return {
      id: row.id,
      username: row.username,
      passwordHash,
      email: row.email,
      createdAt: row.created_at,
      lastLogin: row.last_login,
    };
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.constraint === 'users_username_key') {
        throw new Error('Username already exists');
      }
      if (error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }
    }
    throw error;
  }
}

/**
 * Authenticate a user and generate a token
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  // Validate input
  const validated = LoginSchema.parse({ username, password });

  // Check if using mock database
  const useMockDb = process.env.USE_MOCK_DB === 'true';
  
  if (useMockDb) {
    // Mock mode - accept any password for demo
    const mockUser = {
      id: '00000000-0000-0000-0000-000000000001',
      username: validated.username,
      email: `${validated.username}@example.com`,
    };

    const token = generateToken({
      userId: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
    });

    return {
      token,
      user: mockUser,
    };
  }

  // Real database mode
  // Find user by username
  const query = `
    SELECT id, username, password_hash, email
    FROM users
    WHERE username = $1
  `;

  const result = await pool.query(query, [validated.username]);

  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await verifyPassword(validated.password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  // Update last login timestamp
  await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  // Generate token
  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const query = `
    SELECT id, username, password_hash, email, created_at, last_login
    FROM users
    WHERE id = $1
  `;

  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    email: row.email,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const query = `
    SELECT id, username, password_hash, email, created_at, last_login
    FROM users
    WHERE username = $1
  `;

  const result = await pool.query(query, [username]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    email: row.email,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}
