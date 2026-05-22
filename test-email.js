require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

console.log('Testing email with:');
console.log('User:', process.env.GMAIL_USER);
console.log('Password length:', process.env.GMAIL_PASSWORD?.length);

transporter.sendMail({
  from: process.env.GMAIL_USER,
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'This is a test email'
}, (err, info) => {
  if (err) {
    console.error('Email error:', err.message);
    process.exit(1);
  } else {
    console.log('Email sent successfully:', info.response);
    process.exit(0);
  }
});
