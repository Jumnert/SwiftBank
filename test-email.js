require('dotenv').config();
const { sendVerificationEmail } = require('./utils/email');

console.log('\n=== ETHEREAL EMAIL TEST ===\n');
console.log('Testing email service...\n');

sendVerificationEmail('test@example.com', '123456').then((ok) => {
  if (ok) {
    console.log('\n✅ Email sent successfully!');
    console.log('Check the preview URL in the logs above to view the email');
    process.exit(0);
  } else {
    console.error('\n❌ Email send failed - check logs above');
    process.exit(1);
  }
}).catch((err) => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
