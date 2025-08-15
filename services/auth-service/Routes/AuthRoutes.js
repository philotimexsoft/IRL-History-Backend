const express = require('express');
const passport = require('passport');
const axios = require('axios');

const router = express.Router();
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || 'http://localhost:9000/v1/api/user-service';

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

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    try {
      const { profile } = req.user;
      const result = await saveUser('google', profile);

      // Send result to opener window
      res.send(`
         <html>
          <body>
            <script>
              window.opener.postMessage(
                ${JSON.stringify({ success: true, token: result.token, user: result.user })},
                "http://localhost:3000"
              );
            </script>
            <h3>Login successful! You can close this window.</h3>
          </body>
        </html>
      `);
    } catch (err) {
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage(
                { success: false, error: "Failed to login via Google ${err}" },
                "http://localhost:3000"
              );
            </script>
            <h3>Login failed. You can close this window.</h3>
          </body>
        </html>
      `);
    }
  }
);

// Discord OAuth
router.get('/discord', passport.authenticate('discord'));

router.get(
  '/discord/callback',
  passport.authenticate('discord', { session: false }),
  async (req, res) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    try {
      const { profile } = req.user;
      const result = await saveUser('discord', profile);

      res.send(`
          <html>
          <body>
            <script>
              window.opener.postMessage(
                ${JSON.stringify({ success: true, token: result.token, user: result.user })},
                "http://localhost:3000"
              );
            </script>
            <h3>Login successful! You can close this window.</h3>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("[Discord Callback Error]", err.message || err);
      res.send(`
         <html>
          <body>
            <script>
              window.opener.postMessage(
                { success: false, error: "Failed to login via Discrod ${err}" },
                "http://localhost:3000"
              );
            </script>
            <h3>Login failed. You can close this window.</h3>
          </body>
        </html>
      `);
    }
  }
);
module.exports = router;
