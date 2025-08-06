const express = require('express');
const passport = require('passport');
const axios = require('axios');

const router = express.Router();
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || 'http://localhost:6000/v1/api/user-service';

// Helper to save user
async function saveUser(provider, profile) {
  const email = profile.email || profile.emails?.[0]?.value;

  if (!email) {
    throw new Error("Email is required from profile");
  }

  const userData = {
    provider,
    profile: {
      id: profile.id,
      username: profile.username || profile.displayName,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      emails: [{ value: email }],
    },
  };

  const res = await axios.post(`${USER_SERVICE_BASE_URL}/social-login`, userData);
  return res.data;
}

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), async (req, res) => {
  try {
    const { profile } = req.user;
    const result = await saveUser('google', profile);

    res.status(200).json({
      success: true,
      provider: 'google',
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    console.error("[Google Callback Error]", err.message || err);
    res.status(500).json({ success: false, error: "Failed to login via Google" });
  }
});

// Discord OAuth
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', passport.authenticate('discord', { session: false }), async (req, res) => {
  try {
    const { profile } = req.user;
    const result = await saveUser('discord', profile);

    res.status(200).json({
      success: true,
      provider: 'discord',
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    console.error("[Discord Callback Error]", err.message || err);
    res.status(500).json({ success: false, error: "Failed to login via Discord" });
  }
});

module.exports = router;
