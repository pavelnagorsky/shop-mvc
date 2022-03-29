const nodemailer = require("nodemailer");

// config mail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

module.exports = (email, subject, message) => {
  return transporter.sendMail({
    from: "Магазин электронный котёнок <pavelnagorsky047@gmail.com>",
    to: email,
    subject: subject,
    html: message
  })
}



