require('dotenv').config();
const { getSmtpCredentials, sendVerificationEmail } = require('./utils/email');

const { user, pass } = getSmtpCredentials();

console.log('Testing email with:');
console.log('User:', user || '(not set)');
console.log('Password length:', pass ? pass.length : 0);

if (!user || !pass) {
  console.error('Set GMAIL_USER/GMAIL_PASSWORD or SMTP_USER/SMTP_PASS in .env');
  process.exit(1);
}

sendVerificationEmail('test@example.com', '123456').then((ok) => {
  if (ok) {
    console.log('Email sent successfully');
    process.exit(0);
  } else {
    console.error('Email send failed');
    process.exit(1);
  }
});
