const router = require("express").Router()
const config = require("../config")
const { nanoid } = require("nanoid")
const parseDuration = require("parse-duration")
const web3 = require("web3")

// Queue
const { generateRarity } = require("../queue/Queue")
const { FlowProducer } = require("bullmq")

// Models
const Collection = require("../models/Collection")
const Token = require("../models/Token")
const Listing = require("../models/Listing")
const Bid = require("../models/Bid")
const Sale = require("../models/Sale")
const Balance = require("../models/Balance")
const Transfer = require("../models/Transfer")
const Auction = require("../models/Auction")
const TokenLike = require("../models/TokenLike")
const CollectionLike = require("../models/CollectionLike")

// Controllers
const TokenController = require("../controllers/TokenController")
const TransferController = require("../controllers/TransferController")
const CollectionController = require("../controllers/CollectionController")
const CommentController = require("../controllers/CommentController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")
const OnlyOwner = require("../middleware/Auth_OwnerOnly")

const { body, validationResult } = require("express-validator")
const { extractUser } = require("../middleware/VerifySignature")

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

// Admin Routes
router.get('/rejected', async (req, res) => {
  const collections = await Collection.find({
    whitelisted: false,
    rejected: true,
  }).sort('-createdAt');
  return res.status(200).json({results: collections});
});

router.get('/pending', async (req, res) => {
  const collections = await Collection.find({
    pending: true,
    whitelisted: false,
  }).sort('-createdAt');
  return res.status(200).json({results: collections});
});

router.put('/:address', [OnlyOwner], async (req, res) => {
  try {
    const forbiddenFields = ['whitelisted', 'rejected', 'pending', 
    'totalSupply', 'rarity', 'traits', 'volume', 'sales', 'floorPrice',
    'averagePrice', 'highestPrice', 'minPrice']

    if (!req.body) return res.status(400).json({ code: 400, message: 'Nothing to update.' })

    const fields = {}
    Object.entries(req.body).forEach(([key, value]) => {
      if (forbiddenFields.includes(key)) return
      fields[key] = value
    })

    const collection = await Collection.findOneAndUpdate({ 
      address: req.params.address 
    }, fields)

    return res.status(200).json({ message: 'Collection Updated successfully', collection })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({code: 500, message: 'Something went wrong.'});
  }
})

router.put('/:address/reject', [AdminOnly], async (req, res) => {
  try {
    const collection = await Collection.findOneAndUpdate({
      address: req.params.address,
    }, {
      whitelisted: false,
      pending: false,
      rejected: true,
    });

    return res.status(200).json({collection});
  } catch (error) {
    res.status(500).json({code: 500, message: 'Something went wrong.'});
  }
});

router.put('/:address/approve', [AdminOnly], async (req, res) => {
  try {
    const { address } = req.params

    const collection = await Collection.findOne({ address })
    if (!collection) return res.status(404).json({ code: 404, message: 'No collection found.' })

    // Update collection to whitelisted state
    collection.whitelisted = true
    collection.pending = false
    collection.rejected = false
    await collection.save()

    // Sync Tokens in the background
    CollectionController.syncTokens(collection)

    return res.status(200).json({ message: 'Collection Approved successfully.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({code: 500, message: 'Something went wrong.'});
  }
})

router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page || 0)
    let size = parseInt(req.query.size || 20)
    const sort = req.query.sort || 'name'
    const chain = req.query.chain

    if (isNaN(size) || size > 50) size = 50
    if (isNaN(page)) page = 0

    const settings = { whitelisted: true }
    if (chain !== 'all') settings.chain = chain
    else { 
      const testnetChains = config.chains.filter((chain) => chain.testnet)
      const labels = testnetChains.map((chain) => chain.label)
      settings.chain = { $nin: labels } 
    }

    if (req.query.filter?.includes('featured')) settings.featured = true
    if (req.query.categories) {
      const categories = req.query.categories.split(',')
      settings.categories = { $in: categories }
    }

    const count = await Collection.countDocuments(settings)
    const totalPageCount = Math.ceil(count / size) - 1

    const collections = await Collection.find(settings).sort(sort).skip(page * size).limit(size).exec()
    return res.status(200).json({
      total: count,
      page,
      size,
      previousPage: page === 0 ? null : page - 1,
      nextPage: page + 1 < totalPageCount ? page + 1 : null,
      totalPageCount,
      results: collections
    })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/search', async (req, res) => {
  try {
    if (!req.query.q) return res.status(200).json({ total: 0, results: [] })

    const addressMatch = await Collection.findOne({ address: req.query.q, whitelisted: true })
    if (addressMatch) return res.status(200).json({ total: 1, results: [addressMatch] })

    let collections = []

    collections = await Collection.aggregate([
      { $match: { $text: { $search: decodeURIComponent(req.query.q) } } },
      { $match: { whitelisted: true } },
      { $sort: { score: { $meta: "textScore" } } },
      { $unset: 'traits' },
      { $limit: 10 }
    ])

    // Perform a partial text search if nothing was found
    if (!collections.length) {
      collections = await Collection.find({
        $or: [
          { "name": new RegExp(decodeURIComponent(req.query.q), "gi") }
        ],
        whitelisted: true
      }).select("-traits")
    }

    return res.status(200).json({ total: collections.length, results: collections })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

// Address routes
router.get('/:address', async (req, res) => {
  try {
    const collection = await Collection.findOne({ address: req.params.address })

    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    let prices = await Listing.aggregate([
      { $match: { contractAddress: req.params.address, active: true } },
      {
        $group: {
          _id: "$collectionId",
          floorPrice: { $min: "$pricePerItem" },
          averagePrice: { $avg: "$pricePerItem" },
          highestPrice: { $max: "$pricePerItem" }
        }
      }
    ])

    if (prices.length)
      delete prices[0]._id
    else prices = [{ floorPrice: 0, averagePrice: 0, highestPrice: 0 }]

    const owners = await Balance.distinct('address', {
      collectionId: req.params.address,
      amount: { $gt: 0 }
    })

    return res.status(200).send({ ...collection.toObject(), ...prices[0], ownerCount: owners.length })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post('/:address/tokens', async (req, res) => {
  let page = parseInt(req.query.page || 0)
  let size = parseInt(req.query.size || 20)
  let sort = req.query.sort || 'tokenId'
  let priceFrom = isNaN(req.query.priceFrom) ? null : req.query.priceFrom
  let priceTo = isNaN(req.query.priceTo) ? null : req.query.priceTo
  let rarityFrom = isNaN(req.query.rarityFrom) ? null : req.query.rarityFrom
  let rarityTo = isNaN(req.query.rarityTo) ? null : req.query.rarityTo
  let rarityRankFrom = isNaN(req.query.rarityRankFrom) ? null : req.query.rarityRankFrom
  let rarityRankTo = isNaN(req.query.rarityRankTo) ? null : req.query.rarityRankTo
  let findQuery = { collectionId: req.params.address.toLowerCase() }
  const filter = req.query.filter || []

  if (isNaN(size) || size > 50) size = 50
  if (isNaN(page)) page = 0

  if (req.body?.traits?.length) {
    const values = []
    const types = new Set()
    const elemMatches = []
    let isNumeric = false
    for (const trait of req.body.traits) {
      values.push(trait.value)
      types.add(trait.trait_type)
      if (!trait.rangeFrom || !trait.rangeTo) {
        elemMatches.push({ $elemMatch: { value: trait.value, trait_type: trait.trait_type } })
      } else {
        isNumeric = true
        const match = { value: {}, trait_type: trait.trait_type }
        if (trait.rangeFrom) match.value = { $exists: true, $gte: trait.rangeFrom }
        if (trait.rangeTo) match.value = { ...match.value, $exists: true, $lte: trait.rangeTo }
        elemMatches.push({ $elemMatch: match })
      }
    }

    if ([...types].length === 1 && !isNumeric) findQuery.traits = { $elemMatch: { value: { $in: values }, trait_type: { $in: [...types] } } }
    else findQuery.traits = { $all: elemMatches }
  }

  if (sort === 'lowestPrice') findQuery.lowestPrice = { $exists: true, $gt: 0 }
  else if (sort === '-highestPrice') findQuery.lowestPrice = { $exists: true, $gt: 0 }
  else if (sort === 'highestBid') findQuery.highestBid = { $exists: true, $gt: 0 }
  else if (sort === "lastSoldAt") findQuery.lastSoldAt = { $exists: true }

  // Price filtering
  if (priceFrom) {
    if (!findQuery.lowestPrice) findQuery.lowestPrice = {}
    findQuery.lowestPrice.$gte = web3.utils.toWei(priceFrom)
    findQuery.lowestPrice.$exists = true
  }

  if (priceTo) {
    if (!findQuery.highestPrice) findQuery.highestPrice = {}
    findQuery.highestPrice.$exists = true
    findQuery.highestPrice.$lte = web3.utils.toWei(priceTo)
  }

  // Rarity filtering
  if (rarityFrom || rarityTo) {
    if (!findQuery.rarity) findQuery.rarity = { $exists: true }
    if (rarityFrom) {
      findQuery.rarity.$gte = rarityFrom
    }
    if (rarityTo) findQuery.rarity.$lte = rarityTo
  } else if (rarityRankFrom || rarityRankTo) {
    if (!findQuery.rarityRank) findQuery.rarityRank = { $exists: true }
    if (rarityRankFrom) {
      findQuery.rarityRank.$lte = rarityRankFrom
    }
    if (rarityRankTo) findQuery.rarityRank.$gte = rarityRankTo
  }

  // Filters
  if (filter.includes('auctions')) {
    findQuery.auctions = { $exists: true, $type: 'array', $ne: [] }
  }
  if (filter.includes('listed') && filter !== 'unlisted') {
    findQuery.lowestPrice = { $exists: true, $gt: 0 }
  }
  if (filter.includes('has-bids')) {
    findQuery.highestBid = { $exists: true, $gt: 0 }
  }
  if (filter.includes('unlisted')) {
    findQuery.lowestPrice = { $eq: 0 }
  }

  let count = await Token.countDocuments(findQuery)
  let totalPageCount = Math.ceil(count / size) - 1

  let tokens = []

  if (count) {
    tokens = await Token
      .find(findQuery)
      .sort(sort)
      .skip(page * size)
      .limit(size)
      .populate('auctions')
      .select('-traits -metadata')
      .exec()
  }

  // If sort is the only filter, return more items
  const keys = Object.keys(findQuery)
  const sorts = ['lowestPrice', '-highestPrice', 'highestBid']

  if (
    keys.length === 2 &&
    !filter.length &&
    sorts.includes(sort) &&
    totalPageCount <= page
  ) {
    const q = { collectionId: req.params.address.toLowerCase() }

    if (sort === 'lowestPrice') q.lowestPrice = { $eq: 0 }
    else if (sort === '-highestPrice') q.highestPrice = { $eq: 0 }
    else if (sort === 'highestBid') q.highestBid = { $eq: 0 }

    count = await Token.countDocuments(q)
    const additionalTokens = await Token
      .find(q)
      .limit(size - tokens.length)
      .skip(page * size)
      .sort('tokenId')
      .populate('auctions')
      .select('-traits -metadata')
      .exec()

    tokens = [...tokens, ...additionalTokens]
  }

  totalPageCount = Math.ceil(count / size) - 1

  return res.status(200).json({
    total: count,
    page,
    size,
    previousPage: page === 0 ? null : page - 1,
    nextPage: page === totalPageCount ? null : page + 1,
    totalPageCount,
    results: tokens
  })
})

router.get('/:address/tokens/snippet', async (req, res) => {
  try {
    const size = Number(req.query.size) || 5
    const fields = req.query.fields?.split(',') || ['name', 'tokenId', 'collectionId', 'imageHosted']

    const include = {}
    fields.forEach((field) => {
      include[field] = true
    })

    const tokens = await Token.aggregate([
      { $match: { collectionId: req.params.address } },
      { $project: include },
      { $sample: { size } }
    ])

    return res.status(200).json({ results: tokens })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
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
      .populate('listings')
      .populate('bids')
      .populate('transfers')
      .populate('auctions')
      .lean()
      .exec()
    if (!token) return res.status(404).json({ message: 'No token found.' })

    if (req.query.include?.includes('likes')) {
      const likes = await TokenLike.find({
        collectionId: req.params.address, 
        tokenId: req.params.tokenId 
      }).select('userAddress')

      token.likes = likes
    }

    return res.status(200).send(token)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:collectionId/comments', CommentController.get)
router.get('/:collectionId/tokens/:tokenId/comments', CommentController.get)

router.get('/:collectionId/tokens/:tokenId/likes', async (req, res) => {
  try {
    if (!req.params.collectionId) return res.status(400).json({ message: 'Missing Collection ID Parameter..' })
    if (!req.params.tokenId) return res.status(400).json({ message: 'Missing TokenID Parameter.' })

    let collectionId = req.params.collectionId
    let tokenId = req.params.tokenId
    const tokenLikes = await TokenLike.find({ collectionId, tokenId }).exec()

    res.status(200).json({ results: tokenLikes, count: tokenLikes.length })

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:collectionId/likes', async (req, res) => {
  try {
    if (!req.params.collectionId) return res.status(400).json({ message: 'Missing Collection ID Parameter.' })

    const collectionId = req.params.collectionId
    const collectionLikes = await CollectionLike.find({ collectionId }).exec()

    res.status(200).json({ results: collectionLikes, count: collectionLikes.length })

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})


router.post('/:collectionId/tokens/:tokenId/likes', [
  extractUser
], async (req, res) => {


  try {
    const data = { collectionId, tokenId } = req.params
    data.userAddress = req.user.address

    let like = await TokenLike.exists(data)
    if (like) {
      await TokenLike.deleteOne(data)
      
      await Token.updateOne({ collectionId: collectionId, tokenId:tokenId}, {
        $inc: { "likes.count": -1 }
      }, { upsert: true })

    } else {
      like = new TokenLike(data)
      await like.save()

      await Token.updateOne({ collectionId: collectionId, tokenId:tokenId}, {
        $inc: { "likes.count": 1 }
      }, { upsert: true })

    }

    return res.status(200).json({ message: 'OK', like })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }


})

router.post('/:collectionId/likes', [
  extractUser
], async (req, res) => {


  try {
    const data = { collectionId } = req.params
    data.userAddress = req.user.address

    let like = await CollectionLike.exists(data)
    if (like) {
      await CollectionLike.deleteOne(data)
      
      await Collection.updateOne({ address: collectionId}, {
        $inc: { "likes.count": -1 }
      })

      return res.status(204).json({ message: 'Like removed.' })

    } else {
      like = new CollectionLike(data)
      await like.save()

      await Collection.updateOne({ address: collectionId}, {
        $inc: { "likes.count": 1 }
      })

    }

    return res.status(200).json({ message: 'OK', like })

  } catch (error) {
    console.error(error)
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }


})


router.get('/:address/token/:tokenId/activity', async (req, res) => {
  try {
    if (!req.params?.address || !req.params.tokenId) return res.status(400).json({ message: 'Missing required URL parameters.' })
    let period = parseDuration(req.query.period)
    if (!period) period = 86400000 // 1d

    let endDate = new Date().getTime()
    if (req.query.timestamp) endDate = new Date(req.query.timestamp).getTime()

    const startDate = endDate - period

    if (!req.query.include) return res.status(400).json({ message: 'Please specify which events to include.' })

    let results = []

    if (req.query.include.includes('sales')) {
      const sales = await Sale.find({
        collectionId: req.params.address.toLowerCase(),
        tokenId: req.params.tokenId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const sale of sales) {
        sale.activityType = 'sale'
      }

      results.push(...sales)
    }

    if (req.query.include.includes('listings')) {
      const listings = await Listing.find({
        contractAddress: req.params.address.toLowerCase(),
        tokenId: req.params.tokenId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const listing of listings) {
        listing.timestamp = listing.createdAt
        listing.activityType = 'listing'
      }

      results.push(...listings)
    }

    if (req.query.include.includes('bids')) {
      const bids = await Bid.find({
        contractAddress: req.params.address.toLowerCase(),
        tokenId: req.params.tokenId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const bid of bids) {
        bid.timestamp = bid.createdAt
        bid.activityType = 'bid'
      }

      results.push(...bids)
    }

    if (req.query.include.includes('transfers')) {
      const transfers = await Transfer.find({
        tokenAddress: req.params.address.toLowerCase(),
        tokenId: req.params.tokenId,
        blockTimestamp: { $gte: startDate, $lte: endDate } // This should be sorted by block timestamp, will do later
      }).lean().exec()

      for (const transfer of transfers) {
        transfer.timestamp = transfer.blockTimestamp ? new Date(transfer.blockTimestamp) : transfer.createdAt
        transfer.activityType = 'transfer'
      }

      results.push(...transfers)
    }

    if (req.query.include.includes('auctions')) {
      const auctions = await Auction.find({
        collectionAddress: req.params.address.toLowerCase(),
        tokenId: req.params.tokenId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const auction of auctions) {
        auction.timestamp = auction.createdAt
        auction.activityType = 'auction'
      }

      results.push(...auctions)
    }

    results = results.sort((a, b) => { return b.timestamp - a.timestamp })

    return res.status(200).json({ total: results.length, results })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get("/:address/activity", async (req, res) => {
  try {
    let period = parseDuration(req.query.period)
    if (!period) period = 86400000 // 1d

    let endDate = new Date().getTime()
    if (req.query.timestamp) endDate = new Date(req.query.timestamp).getTime()

    const startDate = endDate - period

    if (!req.query.include) return res.status(400).json({ message: 'Please specify which events to include.' })

    let results = []

    if (req.query.include.includes('sales')) {
      const sales = await Sale.find({
        collectionId: req.params.address,
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const sale of sales) {
        sale.activityType = 'sale'
      }

      results.push(...sales)
    }

    if (req.query.include.includes('listings')) {
      const listings = await Listing.find({
        contractAddress: req.params.address,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const listing of listings) {
        listing.timestamp = listing.createdAt
        listing.activityType = 'listing'
      }

      results.push(...listings)
    }

    if (req.query.include.includes('bids')) {
      const bids = await Bid.find({
        contractAddress: req.params.address,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const bid of bids) {
        bid.timestamp = bid.createdAt
        bid.activityType = 'bid'
      }

      results.push(...bids)
    }

    if (req.query.include.includes('transfers')) {
      const transfers = await Transfer.find({
        tokenAddress: req.params.address,
        blockTimestamp: { $gte: startDate, $lte: endDate } // This should be sorted by block timestamp, will do later
      }).lean().exec()

      for (const transfer of transfers) {
        transfer.timestamp = transfer.blockTimestamp ? new Date(transfer.blockTimestamp) : transfer.createdAt
        transfer.activityType = 'transfer'
      }

      results.push(...transfers)
    }

    results = results.sort((a, b) => { return b.timestamp - a.timestamp })

    res.status(200).json({ total: results.length, results })

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/sales', async (req, res) => {
  let period = parseDuration(req.query.period)
  if (!period) period = 86400000 // 1d

  const now = new Date().getTime()
  const startDate = now - period

  const sales = await Sale.find({
    collectionId: req.params.address,
    timestamp: { $gte: startDate }
  })

  const volume = sales.reduce((acc, curr) => acc + curr.value, 0)
  const totalSales = sales.length

  return res.status(200).json({ volume, totalSales, results: sales })
})

router.post('/', async (req, res) => {
  try {
    if (!req.body?.address) return res.status(400).json({ message: 'Missing required parameters.' })
    if (!req.body.slug) req.body.slug = nanoid()

    const collection = new Collection({ ...req.body, whitelisted: false, pending: true })
    if (!collection.currency) {
      collection.currency = {
        name: 'Honey',
        symbol: 'HNY',
        contract: process.env.DEFAULT_CURRENCY
      }
    }
    await collection.save()

    await CollectionController.sendAddedMail(collection.toObject())

    return res.status(200).send(collection)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post("/:address/resend-mail", [AdminOnly], async (req, res) => {
  try {
    const collection = await Collection.findOne({ address: req.params.address }).exec()
    if (collection) await CollectionController.sendAddedMail(collection.toObject())

    return res.status(200).json({ message: 'Mail sent successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.put("/:address", [OnlyOwner], async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ message: 'No request body.' })

    const collection = await Collection.findOne({ address: req.params.address })
    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    const forbiddenFields = [
      'traits', 'volume', 'sales', 'pending', 'currency', 'contractType'
    ]

    for (const field of forbiddenFields) {
      if (req.body[field]) delete req.body[field]
    }

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
  const collection = await Collection.findOne({ address: req.params.address.toLowerCase() })
  if (!collection) return res.status(404).json({ message: 'No collection found.' })

  CollectionController.syncTokens(collection)
  return res.sendStatus(200)
})

router.get("/:address/sync-tokensTesting982736", async (req, res) => {
  const collection = await Collection.findOne({ address: req.params.address.toLowerCase() })
  if (!collection) return res.status(404).json({ message: 'No collection found.' })

  CollectionController.syncTokensManuel(collection)
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

router.post("/:address/clear-duplicates", async (req, res) => {
  TokenController.removeDuplicates(req.params.address)
  return res.status(200).json({ message: 'Process started.' })
})

router.delete("/:address/tokens", [AdminOnly], async (req, res) => {
  const deleted = await Token.deleteMany({ collectionId: req.params.address })
  return res.status(204).json({ deletedCount: deleted.deletedCount, message: 'Deletion successful' })
})

module.exports = router