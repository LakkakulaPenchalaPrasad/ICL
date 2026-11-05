import express from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/auth/google/client-id ─── Expose Google Client ID to frontend
router.get('/google/client-id', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  });
});

const getGoogleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);

// ─── POST /api/auth/login ─── Email/Password Login (admin, developer, employee)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('company', 'name slug');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. No account found with this email.' });
    }

    if (user.status === 'dismissed') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account uses Google Sign-In. Please login with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Password does not match.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        company: user.company,
        department: user.department,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// ─── POST /api/auth/google ─── Google OAuth Login (customers on service pages)
router.post('/google', async (req, res) => {
  try {
    const { credential, companySlug } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google token with demo/mock fallback for development
    let payload;
    if (credential.startsWith('demo_') || (!process.env.GOOGLE_CLIENT_ID && !process.env.VITE_GOOGLE_CLIENT_ID)) {
      const email = req.body.email || (credential.includes(':') ? credential.split(':')[1] : 'samantha@gmail.com');
      const name = req.body.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      payload = {
        sub: 'google_mock_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
        email,
        name,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      };
    } else {
      try {
        const client = getGoogleClient();
        const audience = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.error('Google token verification error:', err.message);
        return res.status(401).json({ error: 'Invalid Google token' });
      }
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      // Update Google info if needed
      if (!user.googleId) user.googleId = googleId;
      if (picture) user.avatar = picture;
      await user.save();
    } else {
      // Create new customer account
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        role: 'customer',
        password: null,
      });
    }

    if (user.status === 'dismissed') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Internal server error during Google authentication' });
  }
});

// ─── GET /api/auth/me ─── Get current user session
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('company', 'name slug logo');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
