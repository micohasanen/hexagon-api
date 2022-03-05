const mongoose = require("mongoose")

const UserSchema = mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  role: String
})

UserSchema.pre('save', function (next) {
  this.address = this.address.toLowerCase()
  next()
})

module.exports = mongoose.model('User', UserSchema)