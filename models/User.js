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
  }
}, { timestamps: true })

module.exports = mongoose.model('User', UserSchema)