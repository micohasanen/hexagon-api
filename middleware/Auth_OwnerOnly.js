const Web3Token = require('web3-token')
const User = require("../models/User")
const Collection = require("../models/Collection")

module.exports = async (req, res, next) => {
  try {
    let token = req.headers.authorization || ''
    if (!token) return res.status(401).json({ message: 'Unauthorized: No auth token set.' })
    token = token.replace('Bearer ', '')
  
    const { address, body } = await Web3Token.verify(token)

    const collection = await Collection.findOne({ address: req.params.address })
    req.collection = collection
  
    const user = await User.findOne({ address: address.toLowerCase() })
    if (user && user.role === 'admin') return next()
  
    if (!collection?.owner || address.toLowerCase() !== collection.owner.toLowerCase()) {
      return res.status(401).json({ message: 'Unauthorized: Not collection owner.' })
    }
  
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Unexpected error.' })
  }
}