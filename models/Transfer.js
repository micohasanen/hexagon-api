const mongoose = require("mongoose")
const TokenController = require("../controllers/TokenController")

const TransferSchema = mongoose.Schema({
  block_timestamp: String,
  contract_type: String,
  transaction_type: String,
  value: String,
  amount: String,
  transaction_hash: {
    type: String,
    unique: true,
    index: true
  },
  token_address: {
    type: String,
    required: true,
    index: true
  },
  from_address: String,
  to_address: String,
  token_id: {
    type: String,
    required: true,
    index: true
  }
}, { timestamps: true })

TransferSchema.pre('save', function(next) {
  this.token_address = this.token_address.toLowerCase()
  next()
})

TransferSchema.post('save', function() {
  TokenController.logTransfer(this)
})

module.exports = mongoose.model('Transfer', TransferSchema)