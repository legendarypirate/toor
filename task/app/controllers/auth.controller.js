require('dotenv').config();  // Энэ нь .env файлыг уншина
// controllers/auth.controller.js - Complete Production Version
const db = require("../models");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const User = db.users;
const Op = db.Sequelize.Op;

// Google OAuth — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL in .env / PM2 (never commit secrets).
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const googleClient =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL
    ? new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URL
      )
    : null;

/** Site origin only (no /api). OAuth must redirect to /auth/callback on the Next app. */
const normalizeFrontendOrigin = (raw) => {
  if (!raw || typeof raw !== "string") return raw;
  let u = raw.trim().replace(/\/+$/, "");
  u = u.replace(/\/api$/i, "");
  return u;
};

const getFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) {
    return normalizeFrontendOrigin(process.env.FRONTEND_URL);
  }

  const host = req.get('host') || '';
  if (host.includes('api.toor.mn')) {
    return 'https://toor.mn';
  }
  if (host.includes('api.label.mn')) {
    return 'https://label.mn';
  }

  return 'http://localhost:3000';
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role || 'worker'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-12345',
    { expiresIn: '7d' }
  );
};

// Prepare User Response
const prepareUserResponse = (user) => {
  const userObj = user.toJSON ? user.toJSON() : user;
  
  // Remove sensitive fields
  delete userObj.password;
  delete userObj.reset_password_token;
  delete userObj.reset_password_expires;
  delete userObj.refresh_token;
  delete userObj.email_verification_token;
  
  return userObj;
};

// ==================== MONGOLIAN PHONE AUTH ====================

// Register with Phone
exports.register = async (req, res) => {
  try {
    const { phone, password, full_name, role, email } = req.body;

    if (!phone || !password || !full_name) {
      return res.status(400).json({ message: "Бүх талбаруудыг бөглөнө үү" });
    }

    // Validate phone number format (Mongolian)
    const phoneRegex = /^[89]\d{7}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Утасны дугаар буруу форматтай байна" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: "Нууц үг хамгийн багадаа 6 тэмдэгтээс бүрдэх ёстой" });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({ message: "Утасны дугаар бүртгэлтэй байна" });
    }

    // Check if email exists (if provided)
    if (email) {
      const emailUser = await User.findOne({ where: { email } });
      if (emailUser) {
        return res.status(409).json({ message: "Имэйл хаяг бүртгэлтэй байна" });
      }
    }

    // Only allow specific roles; default to worker
    const allowedRoles = ["director", "general_manager", "supervisor", "worker"];
    const userRole = allowedRoles.includes(role) ? role : "worker";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      phone,
      password: hashedPassword,
      full_name,
      email: email || null,
      role: userRole,
      is_active: true,
      provider: 'local'
    });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    const userResponse = prepareUserResponse(user);
    
    // Save refresh token
    await user.update({ refresh_token: refreshToken }, {
      fields: ['refresh_token'],
      returning: false
    });

    res.status(201).json({ 
      success: true,
      message: "Бүртгэл амжилттай", 
      token,
      refresh_token: refreshToken,
      user: userResponse 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: "Серверийн алдаа" });
  }
};

// Login with Phone
exports.login = async (req, res) => {
  try {
    console.log('Login attempt with:', { 
      phone: req.body.phone, 
      email: req.body.email 
    });
    
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: "Утасны дугаар/имэйл болон нууц үг оруулна уу" });
    }

    // Find user by phone or email
    let user;
    const userAttributes = ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'password', 'created_at', 'updated_at'];
    if (phone) {
      console.log('Searching for user with phone:', phone);
      user = await User.findOne({ 
        where: { phone },
        attributes: userAttributes
      });
    } else if (email) {
      console.log('Searching for user with email:', email);
      user = await User.findOne({ 
        where: { email },
        attributes: userAttributes
      });
    }
    
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: "Утасны дугаар/имэйл эсвэл нууц үг буруу байна" });
    }

    console.log('User found:', { 
      id: user.id, 
      phone: user.phone,
      email: user.email,
      is_active: user.is_active 
    });

    // Check if user is active
    if (!user.is_active) {
      console.log('User is inactive');
      return res.status(403).json({ message: "Таны бүртгэл идэвхгүй байна" });
    }

    // Check if user has password (for social login users)
    if (!user.password) {
      console.log('User has no password (social login)');
      return res.status(400).json({ 
        message: "Энэ хаягаар Google хаягаар нэвтэрсэн байна. Google хаягаар нэвтэрнэ үү" 
      });
    }

    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ message: "Утасны дугаар/имэйл эсвэл нууц үг буруу байна" });
    }

    // Generate JWT token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Save refresh token without triggering full reload
    await user.update({ refresh_token: refreshToken }, {
      fields: ['refresh_token'],
      returning: false
    });

    const userResponse = prepareUserResponse(user);

    console.log('Login successful for user:', user.id);
    
    res.json({
      success: true,
      message: "Амжилттай нэвтэрлээ",
      token,
      refresh_token: refreshToken,
      user: userResponse
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Нэвтрэхэд алдаа гарлаа" });
  }
};

// ==================== GOOGLE OAUTH 2.0 ====================

// Generate Google OAuth URL
exports.googleAuth = (req, res) => {
  try {
    if (!googleClient) {
      const missing = [
        !GOOGLE_CLIENT_ID && "GOOGLE_CLIENT_ID",
        !GOOGLE_CLIENT_SECRET && "GOOGLE_CLIENT_SECRET",
        !GOOGLE_CALLBACK_URL && "GOOGLE_CALLBACK_URL",
      ].filter(Boolean);
      console.error(
        "Google OAuth misconfiguration. Missing env vars:",
        missing.join(", ")
      );
      return res.status(503).json({
        success: false,
        message: "Google нэвтрэх сервер дээр тохируулаагүй байна",
      });
    }

    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      prompt: 'consent'
    });
    
    res.json({
      success: true,
      data: {
        auth_url: authUrl
      },
      message: 'Google нэвтрэх холбоос'
    });
    
  } catch (error) {
    console.error('Google Auth URL generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Google нэвтрэх холболтыг үүсгэхэд алдаа гарлаа' 
    });
  }
};

// Handle Google OAuth Callback
exports.googleCallback = async (req, res) => {
  try {
    if (!googleClient) {
      console.error(
        "Google OAuth misconfiguration. Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL"
      );
      const frontendUrl = getFrontendUrl(req);
      const url = new URL(`${frontendUrl}/auth/callback`);
      url.hash = `#error=${encodeURIComponent("Google нэвтрэх тохируулаагүй байна")}`;
      return res.redirect(url.toString());
    }

    const { code, error } = req.query;
    
    const frontendUrl = getFrontendUrl(req);
    const redirectUrl = `https://toor.mn/auth/callback`;
    
    // Check for error parameter first (when user cancels authentication)
    if (error) {
      let errorMessage = 'Google нэвтрэх цуцлагдсан';
      
      if (error === 'access_denied') {
        errorMessage = 'Та Google нэвтрэхийг цуцласан байна';
      } else if (error === 'invalid_request') {
        errorMessage = 'Хүчингүй хүсэлт';
      }
      
      // Create URL with error in fragment/hash
      const url = new URL(redirectUrl);
      url.hash = `#error=${encodeURIComponent(errorMessage)}`;
      
      return res.redirect(url.toString());
    }
    
    // Check if code is missing
    if (!code) {
      const url = new URL(redirectUrl);
      url.hash = `#error=${encodeURIComponent('Баталгаажуулах код шаардлагатай')}`;
      
      return res.redirect(url.toString());
    }
    
    // Exchange authorization code for tokens
    const { tokens } = await googleClient.getToken(code);
    
    // Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const avatar = payload.picture;
    
    // Check if user exists by google_id or email
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { google_id: googleId },
          { email: email }
        ]
      },
      attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'created_at', 'updated_at']
    });
    
    // User creation/update logic
    if (!user) {
      // Create new user
      user = await User.create({
        google_id: googleId,
        email: email,
        full_name: name || `${payload.given_name} ${payload.family_name}`,
        first_name: payload.given_name || '',
        last_name: payload.family_name || '',
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}`,
        provider: 'google',
        is_verified: payload.email_verified || true,
        is_active: true,
        role: 'worker'
      });
    } else {
      // Update existing user
      const updates = {
        provider: 'google',
        is_verified: true
      };
      
      if (!user.google_id) updates.google_id = googleId;
      if (!user.avatar && avatar) updates.avatar = avatar;
      if (!user.full_name && name) updates.full_name = name;
      
      await user.update(updates);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Save refresh token without triggering full reload
    await user.update({ refresh_token: refreshToken }, {
      fields: ['refresh_token'],
      returning: false
    });
    
    // Prepare user response
    const userResponse = prepareUserResponse(user);
    
    // Create URL with token in fragment/hash
    const url = new URL(redirectUrl);
    url.hash = `#token=${encodeURIComponent(token)}` +
               `&refresh_token=${encodeURIComponent(refreshToken)}` +
               `&user=${encodeURIComponent(JSON.stringify(userResponse))}`;
    
    // Redirect to frontend
    return res.redirect(url.toString());
    
  } catch (error) {
    console.error('Google callback error:', error);
    
    let errorMessage = 'Google нэвтрэхэд алдаа гарлаа';
    
    if (error.message.includes('invalid_grant')) {
      errorMessage = 'Баталгаажуулах код хугацаа нь дууссан';
    }
    
    const frontendUrl = getFrontendUrl(req);
    const errorRedirectUrl = `${frontendUrl}/auth/callback` +
      `#error=${encodeURIComponent(errorMessage)}`;
    
    return res.redirect(errorRedirectUrl);
  }
};
// ==================== FACEBOOK OAUTH ====================

exports.facebookAuth = async (req, res) => {
  try {
    const { accessToken, userId, email, name } = req.body;
    
    if (!accessToken || !userId) {
      return res.status(400).json({
        message: 'Facebook мэдээлэл шаардлагатай'
      });
    }
    
    // Find or create user
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { facebook_id: userId },
          { email: email }
        ]
      },
      attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'created_at', 'updated_at']
    });
    
    const userData = {
      facebook_id: userId,
      email: email,
      full_name: name || 'Facebook User',
      first_name: name?.split(' ')[0] || '',
      last_name: name?.split(' ').slice(1).join(' ') || '',
      avatar: `https://graph.facebook.com/${userId}/picture?type=large`,
      provider: 'facebook',
      is_verified: true,
      is_active: true,
      role: 'worker'
    };
    
    if (!user) {
      user = await User.create(userData);
    } else {
      const updates = {};
      if (!user.facebook_id) updates.facebook_id = userId;
      if (!user.provider) updates.provider = 'facebook';
      
      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }
    }
    
    // Generate token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Update refresh token without triggering a full reload
    await user.update({ refresh_token: refreshToken }, {
      fields: ['refresh_token'],
      returning: false
    });
    
    // Reload user with explicit attributes to avoid selecting non-existent columns
    await user.reload({
      attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'created_at', 'updated_at']
    });
    
    const userResponse = prepareUserResponse(user);
    
    res.json({
      message: 'Facebook хаягаар амжилттай нэвтэрлээ',
      token,
      refresh_token: refreshToken,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({
      message: 'Facebook нэвтрэхэд алдаа гарлаа'
    });
  }
};

// Facebook Callback (simplified)
exports.facebookCallback = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Facebook callback received',
      data: req.query
    });
  } catch (error) {
    console.error('Facebook callback error:', error);
    res.status(500).json({
      message: 'Facebook callback алдаа'
    });
  }
};

// ==================== TOKEN MANAGEMENT ====================

// Refresh Access Token
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        message: 'Refresh token шаардлагатай'
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token, 
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-12345'
      );
    } catch (error) {
      return res.status(401).json({
        message: 'Хүчингүй эсвэл хугацаа дууссан refresh token'
      });
    }
    
    // Find user with this refresh token
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        refresh_token: refresh_token
      },
      attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'refresh_token', 'created_at', 'updated_at']
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Хэрэглэгч олдсонгүй'
      });
    }
    
    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Update refresh token in database without triggering full reload
    await user.update({ refresh_token: newRefreshToken }, {
      fields: ['refresh_token'],
      returning: false
    });
    
    const userResponse = prepareUserResponse(user);
    
    res.json({
      message: 'Token шинэчлэгдлээ',
      token: newToken,
      refresh_token: newRefreshToken,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      message: 'Token шинэчлэхэд алдаа гарлаа'
    });
  }
};

// Verify Token Middleware
exports.verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Токен шаардлагатай" });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ message: "Токен хүчинтэй биш байна" });
    }
    
    try {
      // Find user - explicitly list attributes to avoid column errors
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'created_at', 'updated_at']
      });
      
      if (!user) {
        return res.status(401).json({ message: "Хэрэглэгч олдсонгүй" });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({ message: "Таны бүртгэл идэвхгүй байна" });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.error('User lookup error:', error);
      res.status(500).json({ message: "Серверийн алдаа" });
    }
  });
};

// ==================== USER MANAGEMENT ====================

// Get Current User
exports.getCurrentUser = (req, res) => {
  try {
    const userResponse = prepareUserResponse(req.user);
    
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Хэрэглэгчийн мэдээлэл авахад алдаа гарлаа'
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;
    const userId = req.user.id;
    
    const updates = {};
    
    if (full_name) updates.full_name = full_name.trim();
    if (phone) {
      // Validate phone number format
      const phoneRegex = /^[89]\d{7}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Утасны дугаар буруу форматтай байна" });
      }
      updates.phone = phone.trim();
    }
    if (email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Имэйл хаяг буруу форматтай байна" });
      }
      updates.email = email.trim();
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'Шинэчлэх мэдээлэл оруулна уу'
      });
    }
    
    await User.update(updates, {
      where: { id: userId }
    });
    
    // Get updated user
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id', 'email', 'full_name', 'first_name', 'last_name', 'avatar', 'google_id', 'provider', 'is_verified', 'is_active', 'role', 'phone', 'facebook_id', 'supervisor_id', 'created_at', 'updated_at']
    });
    const userResponse = prepareUserResponse(updatedUser);
    
    res.json({
      message: 'Профайл амжилттай шинэчлэгдлээ',
      user: userResponse
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Профайл шинэчлэхэд алдаа гарлаа'
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Хуучин болон шинэ нууц үгээ оруулна уу'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Шинэ нууц үг хамгийн багадаа 6 тэмдэгтээс бүрдэх ёстой'
      });
    }
    
    // Get user with password
    const user = await User.findByPk(userId, {
      attributes: { include: ['password'] }
    });
    
    if (!user.password) {
      return res.status(400).json({
        message: 'Энэ хаяг нь нийгмийн сүлжээгээр нэвтэрсэн байна'
      });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Хуучин нууц үг буруу байна'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await user.update({
      password: hashedPassword
    });
    
    res.json({
      message: 'Нууц үг амжилттай солигдлоо'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Нууц үг солиход алдаа гарлаа'
    });
  }
};

// ==================== LOGOUT ====================

// Logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Clear refresh token from database
    if (userId) {
      await User.update({ refresh_token: null }, {
        where: { id: userId }
      });
    }
    
    res.json({
      message: 'Амжилттай гарлаа'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Гарахад алдаа гарлаа'
    });
  }
};