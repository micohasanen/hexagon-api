const router = require("express").Router()
const { body, validationResult } = require("express-validator")

// Models
const Auction = require("../models/Auction")
const Collection = require("../models/Collection")

// Utils
const contractUtils = require("../utils/contractType")
const GetProvider = require("../utils/ChainProvider")

function isExpired (timestamp) {
  const expiry = new Date(timestamp).getTime()
  const now = new Date().getTime()

  if (expiry < now / 1000) return true
  return false
}

router.post("/", [
  body('collectionAddress').exists().notEmpty().isString(),
  body('owner').exists().notEmpty().isString(),
  body('tokenId').exists().notEmpty(),
  body('expiry').exists().notEmpty().custom(value => !isNaN(value) && !isExpired(value)),
  body('quantity').exists().notEmpty().custom(value => !isNaN(value) && value > 0),
  body('minBid').exists().notEmpty().custom(value => !isNaN(value) && value > 0)
], async (req, res) => {
  try {
    if (!validationResult(req).isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', error: validationResult(req).array() })
    }

    const percentIncrement = req.body.percentIncrement
    if (!percentIncrement || isNaN(percentIncrement) || percentIncrement < 50) 
      percentIncrement = 50

    const collection = await Collection.findOne({ address: req.body.collectionAddress })
    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    if (!collection.contractType) {
      const { Provider } = GetProvider(collection.chain)
      const code = Provider.eth.getCode(collection.address)
      collection.contractType = contractUtils.getContractType(code)
    }

    if (collection.contractType === 'ERC721') {
      if (Number(req.body.quantity) !== 1)
        return res.status(400).json({ message: 'Quantity must be 1 for this token type.' })
    }

    const auction = new Auction({ ...req.body, active: false })
    await auction.save()

    return res.status(200).send(auction)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router