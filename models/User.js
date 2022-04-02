const mongoose = require("mongoose")

const UserSchema = mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  role: String,
  socials: [{
    name: String,
    href: String
  }],
  username: String,
  description: String,
  images: {
    banner: String,
    profile: String
  },
  volume: {
    total: {
      type: Number,
      default: 0
    },
    day: {
      type: Number,
      default: 0
    },
    week: {
      type: Number,
      default: 0
    },
    month: {
      type: Number,
      default: 0
    },
    default: {}
  }
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)