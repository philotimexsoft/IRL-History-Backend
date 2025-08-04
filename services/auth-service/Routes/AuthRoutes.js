const express = require('express');
const passport = require('passport');
const router = express.Router();

router.post('/login', (req, res) => {
  // this is the normal email and password logi
  res.send('Login');
});
router.post('/register', (req, res) => {
  // same this is the normal registration withou google or discord like that..
  res.send('Register');
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

// Discord OAuth
router.get('/discord', passport.authenticate('discord'));
router.get('/discord/callback', passport.authenticate('discord', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
