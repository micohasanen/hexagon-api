const router = require("express").Router()
const { body, validationResult } = require("express-validator")
const ABI_ERC20 = require("../abis/ERC20.json")

// Models
const Bid = require("../models/Bid")
const Collection = require("../models/Collection")
const Listing = require("../models/Listing")

// Controllers
const BidController = require("../controllers/BidController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")

// Utils
const GetProvider = require("../utils/ChainProvider")
const { isExpired } = require("../utils/base")

async function checkBalance(chain, currency, user) { // Supports ERC20
  const { Provider } = GetProvider(chain)
  const contract = new Provider.eth.Contract(ABI_ERC20, currency)

  const balance = await contract.methods.balanceOf(user).call()

  return balance
}

router.post("/", [
  body('contractAddress').exists().notEmpty().isString(),
  body('userAddress').exists().notEmpty().isString(),
  body('tokenId').exists().notEmpty(),
  body('quantity').exists().notEmpty().custom(value => !isNaN(value) && value > 0),
  body('pricePerItem').exists().notEmpty().custom(value => !isNaN(value) && value > 0),
  body('expiry').exists().notEmpty().custom(value => !isNaN(value) && !isExpired(value)),
  body('nonce').exists().notEmpty().custom(value => !isNaN(value) && value > 0),
  body('r').exists().notEmpty().isString(),
  body('s').exists().notEmpty().isString(),
  body('v').exists().notEmpty().custom(value => !isNaN(value))
], async (req, res) => {
  try {
    const address = (req.body.contractAddress || req.body.collectionId).toLowerCase()
    const user = req.body.userAddress
    const data = req.body

    const collection = await Collection.findOne({ address: address }).select("chain currency").exec()
    if (!collection) return res.status(406).json({ message: 'Invalid collection address.' })

    let prices = await Listing.aggregate([
      { $match: { collectionId: address, active: true }},
      { $group: { 
        _id: "$collectionId", 
        floorPrice: { $min: "$pricePerItem" }
      }}
    ])

    if (prices.length) {
      if(data.pricePerItem < prices[0].floorPrice / 2) { 
        return res.status(400).json({ message: 'Bid must be at least 50% of floor price.'}) 
      }
    }

    const currency = collection.currency?.contract || process.env.DEFAULT_CURRENCY
    if (!currency) throw new Error('No collection currency')

    const balance = await checkBalance(collection.chain, currency, user)

    const requiredValue = Number(data.pricePerItem) * Number(data.quantity)
    if (balance < requiredValue) return res.status(400).json({ message: 'Insufficient token balance.' })

    const hasBid = await Bid.findOne({ active: true, tokenId: data.tokenId, contractAddress: address, userAddress: user })
    if (hasBid) return res.status(400).json({ message: 'Only one bid allowed.' })

    const bid = new Bid({ ...data, chain: collection.chain })
    bid.active = true
    await bid.save()

    res.status(200).send(bid)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post("/accept", [AdminOnly], async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ message: 'Request body needed' })

    const { bid, sale } = await BidController.accept(req.body)
    return res.status(200).json({ bid, sale })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.delete("/:id", [AdminOnly], async (req, res) => {
  try {
    const bid = await Bid.findOne({ _id: req.params.id })

    console.log(bid)

    bid.active = false
    bid.canceled = true
    bid.r = bid.s = 'null'
    await bid.save()

    return res.status(204).json({ message: `Bid ${req.params.id} deleted successfully.`})
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router