const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { cacheSet, cacheDel } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  
  return { accessToken, refreshToken };
}

const register = asyncHandler(async (req, res) => {
  const { email, username, password, full_name } = req.body;
  
  // Check if user exists
  const existing = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email.toLowerCase(), username.toLowerCase()]
  );
  
  if (existing.rows.length > 0) {
    return res.status(409).json({ 
      success: false, 
      message: 'Email or username already taken' 
    });
  }
  
  // Hash password
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);
  
  // Verification token
  const verification_token = uuidv4();
  
  // Create user
  const result = await query(
    `INSERT INTO users (email, username, password_hash, full_name, verification_token, role)
     VALUES ($1, $2, $3, $4, $5, 'student')
     RETURNING id, email, username, full_name, role, is_active, is_verified, created_at`,
    [email.toLowerCase(), username.toLowerCase(), password_hash, full_name, verification_token]
  );
  
  const user = result.rows[0];
  const { accessToken, refreshToken } = generateTokens(user);
  
  logger.info('New user registered:', { userId: user.id, email: user.email });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_verified: user.is_verified,
      },
      accessToken,
      refreshToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await query(
    `SELECT id, email, username, full_name, avatar_url, password_hash, role, is_active, is_verified
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  
  if (!result.rows.length) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
  
  const user = result.rows[0];
  
  if (!user.is_active) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account suspended. Contact support.' 
    });
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isPasswordValid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid credentials' 
    });
  }
  
  // Update last login
  await query(
    'UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
    [user.id]
  );
  
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Cache user data
  const userData = {
    id: user.id,
    email: user.email,
    username: user.username,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    role: user.role,
    is_active: user.is_active,
    is_verified: user.is_verified,
  };
  
  await cacheSet(`user:${user.id}`, userData, 300);
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userData,
      accessToken,
      refreshToken,
    },
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }
  
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
  
  const result = await query(
    'SELECT id, email, username, full_name, avatar_url, role, is_active FROM users WHERE id = $1',
    [decoded.id]
  );
  
  if (!result.rows.length || !result.rows[0].is_active) {
    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  }
  
  const user = result.rows[0];
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  
  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefreshToken },
  });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await cacheDel(`user:${req.user.id}`);
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, email, username, full_name, avatar_url, bio, role, is_active, is_verified, 
     last_login, created_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  res.json({ success: true, data: result.rows[0] });
});

const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );
  
  const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
  
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }
  
  const newHash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  await cacheDel(`user:${req.user.id}`);
  
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = { register, login, refreshToken, logout, getMe, changePassword };
