const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const env = require('../config/env');

const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_EXPIRES_IN_DAYS = env.REFRESH_TOKEN_EXPIRES_IN;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    REFRESH_SECRET,
    {
      expiresIn: `${REFRESH_EXPIRES_IN_DAYS}d`,
      // Without a random jti, two calls for the same user within the same
      // second (same payload + same iat + same secret) produce the exact
      // same token string — and RefreshToken.token is @unique, so the second
      // save would crash with a constraint violation instead of rotating.
      jwtid: crypto.randomUUID(),
    }
  );
}

async function saveRefreshToken(userId, refreshToken) {
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId,
      expiresAt,
    },
  });
}

// Validates a refresh token, revokes it, and issues a fresh access + refresh pair.
async function rotateRefreshToken(refreshToken) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: hashToken(refreshToken) },
  });
  if (!stored) {
    const error = new Error('Invalid refresh token');
    error.status = 401;
    throw error;
  }
  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const error = new Error('Refresh token expired');
    error.status = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    throw error;
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const nextRefreshToken = signRefreshToken(user);
  await saveRefreshToken(user.id, nextRefreshToken);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken: signAccessToken(user),
    refreshToken: nextRefreshToken,
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  saveRefreshToken,
  rotateRefreshToken,
  hashToken,
};
