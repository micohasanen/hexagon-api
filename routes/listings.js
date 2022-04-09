const router = require("express").Router()
const { body, validationResult } = require("express-validator")
const { expireListing } = require("../queue/Queue")

// Models
const Listing = require("../models/Listing")
const Collection = require("../models/Collection")
const Token = require("../models/Token")

// Controllers
const TokenController = require("../controllers/TokenController")
const ListingController = require("../controllers/ListingController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")
const { verifyListing } = require("../middleware/VerifySignature")
const { isExpired } = require("../utils/base")

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
  verifyListing
], async (req, res) => {
  try {
    if (!validationResult(req).isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', error: validationResult(req).array() })
    }

    const address = req.body.contractAddress
    const userAddress = req.body.userAddress

    const collection = await Collection.findOne({ address: address.toLowerCase() }).select('chain minPrice')
    const token = await Token.findOne({ collectionId: address, tokenId: req.body.tokenId }).populate('listings', { 'active': 1, '_id': 1 })
    if (!collection || !token) return res.status(400).json({ message: 'Invalid token or collection ID.'})

    console.log(collection)

    if (collection.minPrice && collection.minPrice > Number(req.body.pricePerItem)) {
      return res.status(400).json({ message: 'Price must be more than minimum price.' })
    }

    const isTokenOwner = await TokenController.isOwnerOfToken(address, userAddress, req.body.tokenId, req.body.quantity)

    if (!isTokenOwner.status) {
      return res.status(401).json({ message: 'Not the token owner.'})
    }

    if (isTokenOwner.contractType === 'ERC721') {
      const listingsActive = token.listings.find((l) => l.active)
      if (listingsActive) return res.status(403).json({ message: 'Only one listing allowed at the same time.'})
    }

    const listing = new Listing({...req.body, chain: collection.chain })
    listing.active = true
    await listing.save() // -> After Save, updates to token listings

    expireListing(listing._id, listing.expiry)

    return res.status(200).send(listing)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post("/accept", AdminOnly, async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ message: 'Request body needed' })

    const { listing, sale } = await ListingController.accept(req.body)
    return res.status(200).json({ listing, sale })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.delete('/:id', AdminOnly, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id })
    listing.active = false
    listing.canceled = true
    listing.r = listing.s = 'null'
    await listing.save()
    return res.status(204).json({ message: `Listing ${req.params.id} canceled successfully.`})
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router