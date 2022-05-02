const nodemailer = require("nodemailer")
const config = require("../config")

const transporter = nodemailer.createTransport(config.smtp)

// https://nodemailer.com/about/
module.exports = async (settings = { to: '', subject: 'Default Email', text: '', html: '' }) => {
  const message = await transporter.sendMail({ from: '"Hexagon Mailer" <noreply@hexagon.trade>', ...settings })

  return Promise.resolve('Message sent', message.messageId)
}