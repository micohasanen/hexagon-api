const router = require("express").Router()
const { body, validationResult, check } = require("express-validator")
const { expireBid } = require("../queue/Queue")
const ABI_ERC20 = require("../abis/ERC20.json")

// Models
const Bid = require("../models/Bid")
const Collection = require("../models/Collection")
const Listing = require("../models/Listing")
const Balance = require("../models/Balance")

// Controllers
const BidController = require("../controllers/BidController")
const NotificationController = require("../controllers/NotificationController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")
const { verifyBid } = require("../middleware/VerifySignature")

// Utils
const GetProvider = require("../utils/ChainProvider")
const { isExpired } = require("../utils/base")

async function checkBalance(chain, currency, user) { // Supports ERC20
  const { Provider } = await GetProvider(chain)
  const contract = new Provider.eth.Contract(ABI_ERC20, currency)

  const balance = await contract.methods.balanceOf(user).call()

  return balance
}

async function sendNotification (bid) {
  const owner = await Balance.find({ 
    collectionId: bid.contractAddress, 
    tokenId: bid.tokenId
  })

  if (owner && owner.length === 1) { // Only sending notification to tokens that have one owner
    delete bid.r
    delete bid.s
    delete bid.v

    NotificationController.addNotification({
      receiver: owner[0].address,
      sender: bid.userAddress,
      notificationType: 'bid',
      value: bid.pricePerItem,
      info: { ...bid.toObject() }
    })
  }
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
  body('v').exists().notEmpty().custom(value => !isNaN(value)),
  verifyBid
], async (req, res) => {
  try {
    const address = (req.body.contractAddress || req.body.collectionId).toLowerCase()
    const user = req.body.userAddress
    const data = req.body

    const collection = await Collection.findOne({ address: address }).select("chain currency minPrice").exec()
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

    if (collection.minPrice && collection.minPrice > Number(req.body.pricePerItem)) {
      return res.status(400).json({ message: 'Price must be more than minimum price.' })
    }

    const currency = collection.currency?.contract || process.env.DEFAULT_CURRENCY
    if (!currency) throw new Error('No collection currency')

    const balance = await checkBalance(collection.chain, currency, user)

    const requiredValue = Number(data.pricePerItem) * Number(data.quantity)
    if (balance < requiredValue) return res.status(400).json({ message: 'Insufficient token balance.' })

    const hasBid = await Bid.findOne({ active: true, tokenId: data.tokenId, contractAddress: address, userAddress: user })
    if (hasBid) return res.status(400).json({ message: 'Only one bid allowed.' })

    const bid = new Bid({ ...data, chain: collection.chain, active: true })
    await bid.save()

    sendNotification(bid)
    expireBid(bid._id, bid.expiry)

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

// Check balance on token focus
router.post('/validate-balance', async (req, res) => {
  try {
    if (!req.body?.bids?.length) return res.status(400).json({ message: 'Bids array required.' })
    
    const bids = await Bid.find({ _id: { $in: req.body.bids }})
    const checkedBids = []
    const collections = {}
    
    for (const b of bids) {
      const bid = b.toObject()
      if (!collections[bid.contractAddress]) {
        const collection = await Collection.findOne({ address: bid.contractAddress })
        collections[bid.contractAddress] = collection
      }

      const collection = collections[bid.contractAddress]
      const balance = await checkBalance(
        collection.chain, 
        collection.currency.contract || process.env.DEFAULT_CURRENCY,
        bid.userAddress
      )

      if (balance < Number(bid.pricePerItem) * Number(bid.quantity)) {
        bid.active = false
        await Bid.updateOne({ _id: bid._id }, { active: false })
      }

      checkedBids.push(bid)
    }

    return res.status(200).send(checkedBids)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router