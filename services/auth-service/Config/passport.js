const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const SteamStrategy = require('passport-steam').Strategy;

// Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/v1/api/auth-service/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // we wil add code to store data in the database, basically we will call user-service to store data in the db
  return done(null, profile);
}));

// Discord OAuth
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: "/v1/api/auth-service/discord/callback",
  scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
  // we wil add code to store data in the database, basically we will call user-service to store data in the db
  return done(null, profile);
}));
