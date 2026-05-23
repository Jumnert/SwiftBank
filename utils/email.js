const nodemailer = require('nodemailer');

const MAX_RETRIES = 2;

/**
 * Email service using Ethereal Email (testing service)
 * Perfect for development - no credit card, no domain verification needed
 * 
 * In production, replace with:
 * - SendGrid
 * - Mailgun
 * - AWS SES
 * - Or any other service
 */

let transporter = null;

async function createTransporter() {
  // For production, use real credentials from env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('[EMAIL] Using custom SMTP configuration');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // For testing, create Ethereal account
  console.log('[EMAIL] Creating Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('[EMAIL] ✅ Ethereal account created');
  console.log('[EMAIL] Email preview URL: https://ethereal.email/messages');
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

async function getTransporter() {
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
}

async function sendMail(to, subject, html, retryCount = 0) {
  try {
    console.log(`[EMAIL] Sending to ${to} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    const transport = await getTransporter();
    
    const info = await transport.sendMail({
      from: 'SwiftBodia <noreply@swiftbodia.com>',
      to: to,
      subject: subject,
      html: html
    });

    console.log(`[EMAIL] ✅ Email sent successfully to ${to}`);
    console.log(`[EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] ❌ Error sending email to ${to} (attempt ${retryCount + 1}):`, err.message);
    
    // Retry on network errors
    const isRetryable = err.message.includes('ECONNREFUSED') ||
      err.message.includes('EHOSTUNREACH') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ENOTFOUND');
    
    if (retryCount < MAX_RETRIES && isRetryable) {
      const delayMs = Math.pow(2, retryCount) * 1000;
      console.log(`[EMAIL] 🔄 Retrying in ${delayMs}ms...`);
      
      transporter = null; // Reset on retry
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
  sendPasswordResetEmail
};
