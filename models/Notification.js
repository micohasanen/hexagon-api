const mongoose = require("mongoose")

const NotificationSchema = mongoose.Schema({
  receiver: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },
  title: String,
  message: String,
  notificationType: String,
  value: Number,
  read: {
    type: Boolean,
    default: false
  },
  readTime: Date,
  info: mongoose.Schema.Types.Mixed
}, { timestamps: true })

module.exports = mongoose.model('Notification', NotificationSchema)