const nodemailer = require('nodemailer');

const SMTP_TIMEOUT_MS = 15000;

/** Render docs use SMTP_*; local .env uses GMAIL_* — support both. */
function getSmtpCredentials() {
  const user = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const pass = (process.env.GMAIL_PASSWORD || process.env.SMTP_PASS || '').trim();
  return { user, pass };
}

function createTransporter() {
  const { user, pass } = getSmtpCredentials();
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS
  });
}

let transporter;

function getTransporter() {
  if (transporter === undefined) {
    transporter = createTransporter();
  }
  return transporter;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    })
  ]);
}

async function sendMail(to, subject, html) {
  const { user } = getSmtpCredentials();
  const transport = getTransporter();
  if (!transport) {
    console.error(
      'Email not configured: set GMAIL_USER and GMAIL_PASSWORD (or SMTP_USER and SMTP_PASS)'
    );
    return false;
  }

  try {
    await withTimeout(
      transport.sendMail({ from: user, to, subject, html }),
      SMTP_TIMEOUT_MS,
      'SMTP send'
    );
    return true;
  } catch (err) {
    console.error('Error sending email:', err.message);
    return false;
  }
}

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationEmail = async (email, otp) => {
  return sendMail(
    email,
    'SwiftBodia - Email Verification',
    `
        <h2>Welcome to SwiftBodia</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #212529; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
  );
};

const sendPasswordResetEmail = async (email, otp) => {
  return sendMail(
    email,
    'SwiftBodia - Password Reset',
    `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is:</p>
        <h1 style="color: #212529; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
  );
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
  getSmtpCredentials
};
