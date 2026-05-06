const nodemailer = require('nodemailer');

const sendWelcomeEmail = async (userEmail, firstName, loginId) => {
  try {
    // Configure your SMTP settings (Use App Passwords for Gmail or real credentials for Brevo/SendGrid/etc.)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: '"Tarix Interstate" <no-reply@tarix.com>', 
      to: userEmail, 
      subject: 'Welcome to Tarix Interstate Travelling Agency!',
      html: `
        <h3>Hello ${firstName},</h3>
        <p>Welcome to Tarix Interstate Travelling Agency. We are thrilled to have you on board!</p>
        <p>Your account has been successfully created. Please find your login credentials below:</p>
        <br>
        <p><strong>Your Login ID:</strong> ${loginId}</p>
        <br>
        <p>Safe travels,</p>
        <p><strong>The Tarix Team</strong></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // You typically don't want the whole registration to crash if just the email fails, 
    // so we catch and log the error here.
  }
};

module.exports = sendWelcomeEmail;