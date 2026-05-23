require('dotenv').config();
const { getResendApiKey, sendVerificationEmail } = require('./utils/email');

const apiKey = getResendApiKey();

console.log('\n=== RESEND EMAIL TEST ===\n');
console.log('API Key Check:');
console.log('✓ API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : '❌ NOT SET');

if (!apiKey) {
  console.error('\n❌ Missing API key. Set in .env:');
  console.error('   RESEND_API_KEY=re_xxxxx');
  console.error('\nGet your key from: https://resend.com/api-keys');
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
