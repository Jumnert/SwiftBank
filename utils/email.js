/**
 * Email service using Resend API
 * Resend is a transactional email service that works reliably on Render
 * 
 * Setup:
 * 1. Sign up at https://resend.com (free, no credit card)
 * 2. Get API key from https://resend.com/api-keys
 * 3. Add to .env: RESEND_API_KEY=re_xxxxx
 * 4. Add to Render environment variables
 */

const MAX_RETRIES = 2;

function getResendApiKey() {
  return (process.env.RESEND_API_KEY || '').trim();
}

async function sendMail(to, subject, html, retryCount = 0) {
  const apiKey = getResendApiKey();
  
  if (!apiKey) {
    console.error(
      '[EMAIL] ❌ Resend API key not configured: set RESEND_API_KEY in .env'
    );
    return false;
  }

  try {
    console.log(`[EMAIL] Sending to ${to} via Resend (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SwiftBodia <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log(`[EMAIL] ✅ Email sent successfully to ${to} (ID: ${result.id})`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] ❌ Error sending email to ${to} (attempt ${retryCount + 1}):`, err.message);
    
    // Retry on network errors
    const isRetryable = err.message.includes('fetch') || 
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('EHOSTUNREACH') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ENOTFOUND');
    
    if (retryCount < MAX_RETRIES && isRetryable) {
      const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`[EMAIL] 🔄 Retrying in ${delayMs}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return sendMail(to, subject, html, retryCount + 1);
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
        <h1 style="color: #2272C3; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
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
        <h1 style="color: #2272C3; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
  );
};

module.exports = {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
  getResendApiKey
};
