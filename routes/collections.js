const router = require("express").Router()
const { FlowProducer } = require("bullmq")
const config = require("../config")
const { nanoid } = require("nanoid")
const Collection = require("../models/Collection")
const Token = require("../models/Token")
const TokenController = require("../controllers/TokenController")
const TransferController = require("../controllers/TransferController")
const { generateRarity } = require("../queue/Queue")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")
const OnlyOwner = require("../middleware/Auth_OwnerOnly")

router.get('/all', async (req, res) => {
  try {
    const collections = await Collection.find()
    return res.status(200).send(collections)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/all/whitelisted', async (req, res) => {
  try {
    const collections = await Collection.find({ whitelisted: true })
    return res.status(200).send(collections)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/', async (req, res) => {
  try {
    const page = req.query.page || 0
    let size = req.query.size || 20
    const sort = req.query.sort || 'name'
    const chain = req.query.chain
    if (size > 50) size = 50

    const collections = await Collection.find({ chain, whitelisted: true }).sort(sort).skip(page * size).limit(size).exec()
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
  let sort = req.query.sort || 'tokenId'
  let findQuery = { collectionId: req.params.address }

  if (pageSize > 50) pageSize = 50

  if (req.body?.traits?.length) {
    page = 0
    const values = []
    const types = new Set()
    const elemMatches = []
    for (const trait of req.body.traits) {
      values.push(trait.value)
      types.add(trait.trait_type)
      elemMatches.push({ $elemMatch: { value: trait.value, trait_type: trait.trait_type } })
    }

    if ([...types].length === 1) findQuery.traits = { $elemMatch: { value: { $in: values }, trait_type: { $in: [...types] } } }
    else if ([...types].length > 1) findQuery.traits = { $all: elemMatches }
  }
  
  const tokens = await Token
    .find(findQuery)
    .sort(sort)
    .skip(page * pageSize)
    .limit(pageSize)
    .populate('listings')
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
    const token = await Token.findOne({ collectionId: req.params.address, tokenId: req.params.tokenId }).populate('listings').exec()
    if (!token) return res.status(404).json({ message: 'No token found.' })

    return res.status(200).send(token)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!req.body?.address) return res.status(400).json({ message: 'Missing required parameters.' })

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

router.put("/:address", async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ message: 'No request body.' })

    const collection = await Collection.findOne({ address: req.params.address })
    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    if (req.body.traits) delete req.body.traits

    Object.entries(req.body).forEach(([key, val]) => {
      collection[key] = val
    })

    await collection.save()
    return res.status(200).send(collection)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.put("/:address/batch-reveal", [OnlyOwner], async (req, res) => {
  try {
    const ids = await Token.find({ collectionId: req.params.address }).distinct('_id')
    const jobs = []
    for (const id of ids) {
      jobs.push({ name: nanoid(), data: id, queueName: 'metadata' })
    }

    //  A flow here where we first get each token's metadata,
    //  and after we have the fresh metadata, we generate rarities
    const flowProducer = new FlowProducer({ connection: config.redisConnection })
    const flow = await flowProducer.add({
      name: nanoid(),
      queueName: 'rarity',
      data: req.params.address,
      children: jobs
    })

    return res.status(200).json({ message: 'Reveal started successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post("/:address/save", async (req, res) => {
  const collection = await Collection.findOne({ address: req.params.address })
  await collection.save()
  return res.send(collection)
})

router.post("/:address/sync-tokens", [AdminOnly], async (req, res) => {
  const collection = await Collection.findOne({ address: req.params.address })
  collection.getAllTokens()
  return res.sendStatus(200)
})

router.post("/:address/generate-attributes", [AdminOnly], async (req, res) => {
  generateRarity(req.params.address)
  return res.status(200).json({ message: 'Rarity generation started successfully.' })
})

router.post("/:address/sync-transfers", [AdminOnly], async (req, res) => {
  TransferController.syncCollectionTransfers(req.params.address)
  return res.status(200).json({ message: 'Syncing started.' })
})

router.delete("/:address/tokens", [AdminOnly], async (req, res) => {
  const deleted = await Token.deleteMany({ collectionId: req.params.address })
  return res.status(204).json({ deletedCount: deleted.deletedCount, message: 'Deletion successful' })
})

module.exports = router