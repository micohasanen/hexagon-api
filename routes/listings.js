const router = require("express").Router()

// Models
const Listing = require("../models/Listing")
const Collection = require("../models/Collection")
const Token = require("../models/Token")

// Controllers
const TokenController = require("../controllers/TokenController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")

router.post("/", async (req, res) => {
  try {
    const address = req.body.contractAddress || req.body.collectionId
    const userAddress = req.body.userAddress || req.body.owner

    if (!req.body?.tokenId || !address) return res.status(400).json({ message: 'Missing required data in requst body.' })

    const collection = await Collection.findOne({ address })
    const tokenExists = await Token.exists({ collectionId: address, tokenId: req.body.tokenId })
    if (!collection || !tokenExists) return res.status(400).json({ message: 'Invalid token or collection ID.'})

    const isTokenOwner = await TokenController.isOwnerOfToken(address, userAddress, req.body.tokenId, req.body.quantity)

    if (!isTokenOwner.status) {
      return res.status(401).json({ message: 'Not the token owner.'})
    }

    const listing = new Listing({...req.body, chain: collection.chain })
    listing.active = true
    // await listing.save()

    return res.status(200).send(listing)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.delete('/:id', AdminOnly, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id })
    listing.active = false
    listing.deleted = true
    await listing.save()
    return res.status(204).json({ message: `Listing ${req.params.id} deleted successfully.`})
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router