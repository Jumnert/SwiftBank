const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { upsertOAuthUser, signToken } = require('../utils/oauth');
const { exchangeGithubCodeForToken, fetchGithubUserEmailProfile } = require('../utils/github');

const router = express.Router();

// Google native sign-in: Android obtains an ID token and sends it here.
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    if (!process.env.GOOGLE_WEB_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth is not configured' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) return res.status(400).json({ error: 'Google account has no email' });

    const user = await upsertOAuthUser({
      email,
      name: payload?.name || payload?.given_name || null,
      profileImageUrl: payload?.picture || null
    });

    const token = signToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        balance: Number(user.balance),
        profile_image_url: user.profile_image_url
      }
    });
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).json({ error: 'Google OAuth failed' });
  }
});

// GitHub OAuth: App opens browser to /api/auth/github and receives callback at /api/auth/github/callback
router.get('/github', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(500).send('GitHub OAuth not configured');
  }
  const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'user:email'
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get('/github/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.status(500).send('GitHub OAuth not configured');
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const accessToken = await exchangeGithubCodeForToken({
      code,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri
    });

    const { email, name, avatarUrl } = await fetchGithubUserEmailProfile(accessToken);
    if (!email) return res.status(400).send('GitHub email not available');

    const user = await upsertOAuthUser({
      email,
      name,
      profileImageUrl: avatarUrl
    });

    const token = signToken(user);
    // For mobile: redirect to a deep link the app can intercept (includes user payload).
    const deepLink = `swiftbodia://oauth?token=${encodeURIComponent(token)}&id=${encodeURIComponent(String(user.id))}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&balance=${encodeURIComponent(String(user.balance ?? 0))}&profile_image_url=${encodeURIComponent(user.profile_image_url || '')}`;
    res.set('content-type', 'text/html').send(
      `<!doctype html><html><body>Logging in…<script>location.href=${JSON.stringify(deepLink)};</script></body></html>`
    );
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    res.status(500).send('GitHub OAuth failed');
  }
});

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

module.exports = router;
