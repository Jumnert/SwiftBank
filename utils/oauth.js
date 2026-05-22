const jwt = require('jsonwebtoken');
const { query } = require('../db/database');

const signToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const upsertOAuthUser = async ({ email, name, profileImageUrl = null }) => {
  // Create if missing; update name/image if present.
  const result = await query(
    `
    INSERT INTO users (email, password, name, is_verified, profile_image_url)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      profile_image_url = COALESCE(EXCLUDED.profile_image_url, users.profile_image_url),
      is_verified = TRUE,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, name, balance, profile_image_url
    `,
    // password is required by schema; use an unusable placeholder for OAuth users
    [email, 'oauth', name || null, true, profileImageUrl]
  );

  return result.rows[0];
};

module.exports = {
  signToken,
  upsertOAuthUser
};

