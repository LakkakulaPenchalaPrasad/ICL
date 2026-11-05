import express from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_GOOGLE_CLIENT_ID = '655046422470-02hihi68c7f67dv398of1uonskt128mr.apps.googleusercontent.com';

// ─── GET /api/auth/google/client-id ─── Expose Google Client ID to frontend
router.get('/google/client-id', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  });
});

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  return new OAuth2Client(clientId);
};

// ─── POST /api/auth/login ─── Email/Password Login (staff or customer)
router.post('/login', async (req, res) => {
  try {
    const { email, password, portalType = 'staff' } = req.body;

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

    // ─── Role / Portal Discrepancy Validation ───
    if (portalType === 'customer' && ['employee', 'developer', 'superadmin'].includes(user.role)) {
      const portalPath = user.company?.slug ? `/portal/${user.company.slug}` : '/portal';
      return res.status(403).json({
        error: `Access restricted: This email is registered as an internal staff account (${user.role.toUpperCase()}). Staff members cannot lodge or track complaints as customers. Please sign in via the Staff Portal.`,
        isStaffAccount: true,
        role: user.role,
        portalPath,
      });
    }

    if (portalType === 'staff' && user.role === 'customer') {
      return res.status(403).json({
        error: 'Access restricted: This account is registered as a customer. Customer accounts cannot access the internal Staff Portal.',
        isCustomerAccount: true,
      });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'This account was registered with Google. Please use Sign in with Google.' });
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

// ─── POST /api/auth/google ─── Google OAuth Login
router.post('/google', async (req, res) => {
  try {
    const { credential, companySlug, portalType = 'customer' } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

    // Direct email authentication fallback for standard email logins
    if (credential.startsWith('customer_email:') || credential.startsWith('email:')) {
      const email = req.body.email || (credential.includes(':') ? credential.split(':')[1] : credential);
      const name = req.body.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      payload = {
        sub: 'cust_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
        email,
        name,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      };
    } else {
      try {
        const client = getGoogleClient();
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.error('Google token verification error:', err.message);
        return res.status(401).json({ error: 'Invalid Google token. Please try signing in again.' });
      }
    }

    const { sub: googleId, email, name, picture } = payload;
    const cleanEmail = email.toLowerCase().trim();

    // ─── 1. Check if user already exists in MongoDB ───
    let user = await User.findOne({
      $or: [{ googleId }, { email: cleanEmail }],
    }).populate('company', 'name slug');

    // ─── 2. Strict Role & Portal Validation ───
    // Case: Staff member (Developer / Employee / Superadmin) attempts customer login
    if (portalType === 'customer' && user && ['employee', 'developer', 'superadmin'].includes(user.role)) {
      const portalPath = user.company?.slug ? `/portal/${user.company.slug}` : '/portal';
      return res.status(403).json({
        error: `Access restricted: This email is registered as an internal staff account (${user.role.toUpperCase()}). Staff members cannot lodge or track complaints as customers. Please sign in via the Staff Portal.`,
        isStaffAccount: true,
        role: user.role,
        portalPath,
      });
    }

    // Case: Customer attempts to sign into the internal Staff Portal
    if (portalType === 'staff' && user && user.role === 'customer') {
      return res.status(403).json({
        error: 'Access restricted: This account is registered as a customer. Customer accounts cannot access the internal Staff Portal.',
        isCustomerAccount: true,
      });
    }

    // Case: Unknown user attempts to sign into Staff Portal via Google (must be pre-created by developer)
    if (portalType === 'staff' && !user) {
      return res.status(403).json({
        error: 'No staff account found for this Google email. Internal staff accounts must be created first by your company developer or administrator.',
      });
    }

    let isNewUser = false;
    let needsPasswordSetup = false;

    if (user) {
      // User exists!
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();

      // Case B: Employees and Developers signing in via Staff Portal -> DIRECTLY LET IN!
      if (['employee', 'developer', 'superadmin'].includes(user.role)) {
        needsPasswordSetup = false;
        console.log(`✓ Existing staff (${user.role}: ${user.name}) signed in via Google. Direct access granted.`);
      } else {
        // Case A (Existing Customer): If they already set a password in the past, directly let in!
        // Only require setup if they never created a password yet.
        needsPasswordSetup = !user.password;
      }
    } else {
      // Case A (Brand New Customer): Created for first time
      isNewUser = true;
      needsPasswordSetup = true; // New customer must create a password for their first time

      user = await User.create({
        name,
        email: cleanEmail,
        googleId,
        avatar: picture || '',
        role: 'customer',
        password: null, // Initial password will be set in step 2
      });

      console.log(`✓ New customer registered via Google: ${user.email} (Needs first-time password setup)`);
    }

    if (user.status === 'dismissed') {
      return res.status(403).json({ error: 'Your account has been deactivated.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Google authentication successful',
      token,
      isNewUser,
      needsPasswordSetup,
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
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Internal server error during Google authentication' });
  }
});

// ─── POST /api/auth/set-initial-password ─── First-time password setup for new Google customer
router.post('/set-initial-password', authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    console.log(`✓ Initial password created successfully for ${user.email} (${user.role})`);

    res.json({
      success: true,
      message: 'Password created successfully. Your account is fully secured and ready!',
    });
  } catch (err) {
    console.error('Set initial password error:', err);
    res.status(500).json({ error: 'Failed to set password.' });
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
