const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const prisma = require('../db');
const auth = require('../middleware/authMiddleware');
const {
  signAccessToken,
  signRefreshToken,
  saveRefreshToken,
  rotateRefreshToken,
} = require('../services/token.service');

// POST /api/auth/register — admin-only.
//
// This used to be public AND defaulted every new account to role 'admin', so
// anyone who could reach the API could mint themselves an admin. It is now
// behind an admin token, with one exception: while the User table is empty the
// very first account may be created unauthenticated (bootstrap), because there
// is no admin yet to authorize it.
async function registerGuard(req, res, next) {
  const userCount = await prisma.user.count();
  if (userCount === 0) return next(); // bootstrap: first ever account
  return auth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  });
}

router.post('/register', registerGuard, async (req, res, next) => {
  const { name, email, password, role } = req.body;
  const isBootstrap = !req.user;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        // Least privilege: 'staff' unless an admin explicitly asks for 'admin'.
        // The bootstrap account is the exception — it must be an admin, or
        // nobody could ever create the second account.
        role: isBootstrap ? 'admin' : role === 'admin' ? 'admin' : 'staff',
      },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    await saveRefreshToken(user.id, refreshToken);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  try {
    const result = await rotateRefreshToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
