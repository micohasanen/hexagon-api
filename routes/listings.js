const router = require("express").Router()

// Models
const Listing = require("../models/Listing")
const Collection = require("../models/Collection")
const Token = require("../models/Token")

// Controllers
const TokenController = require("../controllers/TokenController")
const ListingController = require("../controllers/ListingController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")

router.post("/", async (req, res) => {
  try {
    const address = req.body.contractAddress || req.body.collectionId
    const userAddress = req.body.userAddress || req.body.owner

    if (!address || !userAddress) return res.status(400).json({ message: 'Missing required data in requst body.' })

    const collection = await Collection.findOne({ address: address.toLowerCase() })
    const token = await Token.findOne({ collectionId: address, tokenId: req.body.tokenId })
    if (!collection || !token) return res.status(400).json({ message: 'Invalid token or collection ID.'})

    const isTokenOwner = await TokenController.isOwnerOfToken(address, userAddress, req.body.tokenId, req.body.quantity)

    if (!isTokenOwner.status) {
      return res.status(401).json({ message: 'Not the token owner.'})
    }

    if (isTokenOwner.contractType === 'ERC721' && token.listings.length) {
      return res.status(401).json({ message: 'Only one listing allowed at the same time.'})
    }

    const listing = new Listing({...req.body, chain: collection.chain })
    listing.active = true
    await listing.save() // -> After Save, updates to token listings

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