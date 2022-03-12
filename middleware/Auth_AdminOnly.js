const Web3Token = require('web3-token')
const User = require("../models/User")

module.exports = async (req, res, next) => {
  try {
    let token = req.headers.authorization || ''
    if (!token) return res.status(401).json({ message: 'Unauthorized: No auth token set.' })
    token = token.replace('Bearer ', '')
  
    const { address, body } = await Web3Token.verify(token)

    console.log({ address, body })
  
    const user = await User.findOne({ address: address.toLowerCase() })
    if (!user) return res.status(401).json({ message: 'Unauthorized: User not found.' })
  
    if (user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized.'})
    req.user = user
  
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized.' })
  }
}