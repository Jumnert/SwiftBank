const { request } = require('undici');

async function exchangeGithubCodeForToken({ code, clientId, clientSecret, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  }).toString();

  const res = await request('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await res.body.json();
  if (!res.statusCode || res.statusCode >= 400) {
    throw new Error(`GitHub token exchange failed (${res.statusCode})`);
  }
  if (!data.access_token) {
    throw new Error(data.error_description || 'Missing access_token');
  }
  return data.access_token;
}

async function fetchGithubUserEmailProfile(accessToken) {
  const headers = {
    'accept': 'application/vnd.github+json',
    'authorization': `Bearer ${accessToken}`,
    'user-agent': 'SwiftBodia'
  };

  const [userRes, emailsRes] = await Promise.all([
    request('https://api.github.com/user', { headers }),
    request('https://api.github.com/user/emails', { headers })
  ]);

  const user = await userRes.body.json();
  const emails = await emailsRes.body.json();

  const primaryEmail = Array.isArray(emails)
    ? (emails.find(e => e.primary && e.verified)?.email || emails.find(e => e.verified)?.email)
    : null;

  return {
    email: primaryEmail || user.email || null,
    name: user.name || user.login || null,
    avatarUrl: user.avatar_url || null
  };
}

module.exports = {
  exchangeGithubCodeForToken,
  fetchGithubUserEmailProfile
};

