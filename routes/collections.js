const router = require("express").Router()
const Collection = require("../models/Collection")
const TokenController = require("../controllers/TokenController")
const TransferController = require("../controllers/TransferController")
const Token = require("../models/Token")

router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find()
    return res.status(200).send(collections)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address', async (req, res) => {
  try {
    const collection = await Collection.findOne({ address: req.params.address })
    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    return res.status(200).send(collection)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post('/:address/tokens', async (req, res) => {
  let page = req.query.page || 0
  let pageSize = req.query.size || 20
  const sort = req.query.sort || 'tokenId'
  let findQuery = { collectionId: req.params.address }

  if (pageSize > 50) pageSize = 50

  if (req.body && req.body.traits?.length) {
    page = 0
    const all = []
    for (const trait of req.body.traits) {
      all.push(trait)
    }

    findQuery.traits = {}
    findQuery.traits.$all = all
  }
  
  const tokens = await Token
    .find(findQuery)
    .sort(sort)
    .skip(page * pageSize)
    .limit(pageSize)
    .exec()
  
  return res.status(200).send(tokens)
})

router.get('/:address/tokens/all', async (req, res) => {
  try {
    const tokens = await TokenController.getAllForCollection(req.params.address)
    console.log(tokens.length)
    return res.status(200).send(tokens)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/token/:tokenId', async (req, res) => {
  try {
    if (!req.params?.address || !req.params.tokenId) return res.status(400).json({ message: 'Missing required url parameters.' })
    const token = await Token.findOne({ collectionId: req.params.address, tokenId: req.params.tokenId })
    if (!token) return res.status(404).json({ message: 'No token found.' })

    return res.status(200).send(token)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body || !req.body.name || !req.body.address) return res.status(400).json({ message: 'Missing required parameters.' })

    const collection = new Collection()
    Object.entries(req.body).forEach(([key, val]) => {
      collection[key] = val
    })

    await collection.save()

    return res.status(200).send(collection)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post("/:address/sync-tokens", async (req, res) => {
  const collection = await Collection.findOne({ address: req.params.address })
  collection.getAllTokens()
  return res.sendStatus(200)
})

router.post("/:address/generate-attributes", async (req, res) => {
  const collection = await Collection.findOne({ address: req.params.address })
  collection.generateAttributes()
  return res.sendStatus(200)
})

router.post("/:address/sync-transfers", async (req, res) => {
  TransferController.syncCollectionTransfers(req.params.address)
  return res.status(200).json({ message: 'Syncing started.' })
})

module.exports = router