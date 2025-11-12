import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate JWT_SECRET is set
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Provide specific error messages based on error type
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        error: 'Database connection failed. Please check your database configuration and ensure the database server is running.' 
      });
    }
    
    if (error.code === '28P01') {
      return res.status(503).json({ 
        error: 'Database authentication failed. Please check your database credentials in .env.local' 
      });
    }
    
    if (error.code === '3D000') {
      return res.status(503).json({ 
        error: 'Database not found. Please ensure the database exists and the name in .env.local is correct.' 
      });
    }

    return res.status(500).json({ 
      error: 'Login failed due to server error. Please check server logs for details.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};
