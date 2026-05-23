require('dotenv').config();
const nodemailer = require('nodemailer');
const { getSmtpCredentials, sendVerificationEmail } = require('./utils/email');

const { user, pass } = getSmtpCredentials();

console.log('\n=== GMAIL SMTP TEST ===\n');
console.log('Credentials Check:');
console.log('✓ User:', user || '❌ NOT SET');
console.log('✓ Password length:', pass ? `${pass.length} chars` : '❌ NOT SET');

if (!user || !pass) {
  console.error('\n❌ Missing credentials. Set in .env:');
  console.error('   GMAIL_USER=your_email@gmail.com');
  console.error('   GMAIL_PASSWORD=your_16_char_app_password');
  console.error('\nOr use SMTP_USER and SMTP_PASS aliases.');
  process.exit(1);
}

console.log('\nAttempting to send test email...\n');

sendVerificationEmail('test@example.com', '123456').then((ok) => {
  if (ok) {
    console.log('✅ Email sent successfully!');
    process.exit(0);
  } else {
    console.error('❌ Email send failed - check logs above');
    process.exit(1);
  }
}).catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
