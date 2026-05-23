const nodemailer = require('nodemailer');

const SMTP_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    pool: {
      maxConnections: 1,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 10
    }
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

async function sendMail(to, subject, html, retryCount = 0) {
  const { user } = getSmtpCredentials();
  const transport = getTransporter();
  
  if (!transport) {
    console.error(
      'Email not configured: set GMAIL_USER and GMAIL_PASSWORD (or SMTP_USER and SMTP_PASS) in .env'
    );
    return false;
  }

  try {
    console.log(`[EMAIL] Sending to ${to} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    await withTimeout(
      transport.sendMail({ from: user, to, subject, html }),
      SMTP_TIMEOUT_MS,
      'SMTP send'
    );
    console.log(`[EMAIL] ✅ Email sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] ❌ Error sending email to ${to} (attempt ${retryCount + 1}):`, err.message);
    
    // Retry on network/timeout errors
    const isRetryable = err.message.includes('timeout') || 
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('EHOSTUNREACH') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('socket hang up');
    
    if (retryCount < MAX_RETRIES && isRetryable) {
      const delayMs = Math.pow(2, retryCount) * 2000;
      console.log(`[EMAIL] 🔄 Retrying in ${delayMs}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      
      transporter = undefined;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return sendMail(to, subject, html, retryCount + 1);
    }
    
    if (err.message.includes('Invalid login') || err.message.includes('535')) {
      console.error('[EMAIL] 🔐 AUTHENTICATION ERROR: Check GMAIL_USER and GMAIL_PASSWORD');
      console.error('[EMAIL] Make sure you are using an App Password, not your regular Gmail password');
      console.error('[EMAIL] Generate one at: https://myaccount.google.com/apppasswords');
    }
    
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
