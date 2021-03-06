const router = require("express").Router()
const parseDuration = require("parse-duration")
const { sanitizeUrl } = require("../utils/base")

// Models
const Balance = require("../models/Balance")
const Token = require("../models/Token")
const Collection = require("../models/Collection")
const Auction = require("../models/Auction")
const Notification = require("../models/Notification")
const User = require("../models/User")
const Transfer = require("../models/Transfer")
const Sale = require("../models/Sale")
const Listing = require("../models/Listing")
const Bid = require("../models/Bid")

const TokenLike = require("../models/TokenLike")
const UserMessageKey = require("../models/UserMessageKey")

// Middleware
const { extractUser } = require("../middleware/VerifySignature")
const AdminOnly = require("../middleware/Auth_AdminOnly")

router.get("/all", [AdminOnly], async (req, res) => {
  try {
    const page = Number(req.query.page) || 0
    const size = Number(req.query.size) || 20

    const count = await User.estimatedDocumentCount()
    const users = await User.find().limit(size).skip(page * size).exec()

    return res.status(200).json({ page, size, total: count, results: users })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get("/search", async (req, res) => {
  try {
    if (!req.query.q) return res.status(200).json({ total: 0, results: [] })

    let users = []

    // Check if exact match for address
    if (req.query.q.startsWith('0x')) {
      users = await User.find({ address: req.query.q }).select('-role').exec()
    }

    // Full text search if no result
    if (!users.length) {
      users = await User.aggregate([
        { $match: { $text: { $search: decodeURIComponent(req.query.q) } } },
        { $sort: { score: { $meta: "textScore" } } },
        { $unset: "role" },
        { $limit: 10 }
      ])
    }

    // Partial text search
    if (!users.length) {
      users = await User.find({
        $or: [
          { "username": new RegExp(decodeURIComponent(req.query.q), "gi") }
        ]
      }).select('-role').limit(10).exec()
    }

    return res.status(200).json({ total: users.length, results: users })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address', async (req, res) => {
  try {
    const user = await User.findOne({ address: req.params.address }).exec()
    if (!user) return res.status(404).json({ message: 'No user found.' })

    const balances = await Balance.aggregate([
      { $match: { address: req.params.address } },
      { $group: { _id: '$collectionId', amount: { $sum: "$amount" } } }
    ])

    let estimatedValue = 0

    for (const balance of balances) {
      const collection = await Collection.findOne({ address: balance._id }).distinct('floorPrice')
      if (collection.length) {
        estimatedValue += collection[0] * balance.amount
      }
    }

    return res.status(200).json({ user: { ...user.toObject(), estimatedValue } })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get("/:address/tokens", async (req, res) => {
  try {
    const chain = req.query.chain || 'mumbai'
    let page = parseInt(req.query.page || 0)
    let size = parseInt(req.query.size || 20)

    if (isNaN(page)) page = 0
    if (isNaN(size) || size > 50) size = 50

    const query = {
      address: req.params.address,
      amount: { $gt: 0 }
    }

    // if (chain && chain !== 'all') query.chain = chain

    const total = await Balance.countDocuments(query)
    const totalPageCount = Math.ceil(total / size) - 1

    const balances = await Balance.find(query)
      .skip(page * size)
      .limit(size)
      .exec()

    const auctionedItems = await Auction.find({
      owner: req.params.address,
      active: true
    })

    const results = []
    console.log(balances)
    for (const balance of balances) {
      const token = await Token.findOne({ collectionId: balance.collectionId, tokenId: balance.tokenId })
        .populate('listings')
        .populate('bids')
        .populate('transfers')
        .select('-traits -metadata')
        .exec()
      results.push(token)
    }

    const auctioned = []
    for (const item of auctionedItems) {
      const token = await Token.findOne({ collectionId: item.collectionAddress, tokenId: item.tokenId })
        .select('-traits -metadata')
        .populate('auctions')
        .exec()

      auctioned.push(token)
    }

    return res.status(200).json({
      total,
      totalPageCount,
      page,
      size,
      previousPage: page === 0 ? null : page - 1,
      nextPage: page === totalPageCount ? null : page + 1,
      results,
      auctioned
    })

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get("/:address/tokens/auctioned", async (req, res) => {
  try {
    if (!req.params.address) return res.status(400).json({ message: 'Address required.' })

    const auctionedItems = await Auction.find({
      owner: req.params.address,
      active: true
    })

    const auctioned = []
    for (const item of auctionedItems) {
      const token = await Token.findOne({ collectionId: item.collectionAddress, tokenId: item.tokenId })
        .select('-traits -metadata')
        .populate('auctions')
        .exec()

      auctioned.push(token)
    }

    return res.status(200).json({
      results: auctioned
    })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/notifications', async (req, res) => {
  try {
    let page = Number(req.query.page) || 0
    let size = Number(req.query.size) || 20

    if (size > 50) size = 50
    const query = { receiver: req.params.address }

    const total = await Notification.countDocuments(query)
    const totalPageCount = Math.ceil(total / size) - 1

    const notifications = await Notification
      .find(query)
      .limit(size)
      .skip(size * page)
      .sort('-createdAt')
      .exec()

    return res.status(200).json({
      total,
      totalPageCount,
      page,
      size,
      nextPage: page === totalPageCount ? null : page + 1,
      previousPage: page === 0 ? null : page - 1,
      results: notifications
    })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/activity', async (req, res) => {
  try {
    let period = parseDuration(req.query.period)
    if (!period) period = 86400000 // 1d

    let endDate = new Date().getTime()
    if (req.query.timestamp) endDate = new Date(req.query.timestamp).getTime()

    const startDate = endDate - period

    if (!req.query.include) return res.status(400).json({ message: 'Please specify which events to include.' })

    let results = []
    const address = req.params.address

    if (req.query.include.includes('transfers')) {
      const transfers = await Transfer.find({
        blockTimestamp: { $gte: startDate, $lte: endDate },
        $or: [{ fromAddress: address }, { toAddress: address }]
      }).lean().exec()

      for (const transfer of transfers) {
        transfer.activityType = 'transfer'
        transfer.timestamp = transfer.blockTimestamp
      }

      results.push(...transfers)
    }

    if (req.query.include.includes('sales')) {
      const sales = await Sale.find({
        timestamp: { $gte: startDate, $lte: endDate },
        $or: [{ seller: address }, { buyer: address }]
      }).lean().exec()

      for (const sale of sales) {
        sale.activityType = 'sale'
      }

      results.push(...sales)
    }

    if (req.query.include.includes('listings')) {
      const listings = await Listing.find({
        userAddress: address,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const listing of listings) {
        listing.activityType = 'listing'
        listing.timestamp = listing.createdAt
      }

      results.push(...listings)
    }

    if (req.query.include.includes('bids')) {
      const bids = await Bid.find({
        userAddress: address,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const bid of bids) {
        bid.activityType = 'bid'
        bid.timestamp = bid.createdAt
      }

      results.push(...bids)
    }

    if (req.query.include.includes('auctions')) {
      const auctions = await Auction.find({
        owner: address,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec()

      for (const auction of auctions) {
        auction.activityType = 'auction'
        auction.timestamp = auction.createdAt
      }

      results.push(...auctions)
    }

    results = results.sort((a, b) => { return b.timestamp - a.timestamp })

    return res.status(200).json({ total: results.length, results })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/offers', async (req, res) => {
  try {
    let period = parseDuration(req.query.period)
    if (!period) period = 86400000 // 1d

    let endDate = new Date().getTime()
    if (req.query.timestamp) endDate = new Date(req.query.timestamp).getTime()

    const startDate = endDate - period
    const includeTokenData = req.query.include?.includes('tokens')
    let offers = []

    const offersMade = await Notification.find({
      sender: req.params.address,
      notificationType: 'bid',
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean().exec()

    for (const made of offersMade) {
      offers.push({
        activityType: 'offerMade',
        timestamp: made.createdAt,
        _id: made.info._id,
        from: made.sender,
        to: made.receiver
      })
    }

    // Hacky way to get offers received without going checking user balances
    const offersReceived = await Notification.find({
      receiver: req.params.address,
      notificationType: 'bid',
      createdAt: { $gte: startDate, $lte: endDate }
    })

    for (const received of offersReceived) {
      offers.push({
        activityType: 'offerReceived',
        timestamp: received.info.createdAt,
        _id: received.info._id,
        from: received.sender,
        to: received.receiver
      })
    }

    // Fetch most recent offer data
    for (let i = 0; i < offers.length; i++) {
      const offer = await Bid.findOne({ _id: offers[i]._id })
      offers[i] = { ...offers[i], ...offer.toObject() }
    }

    if (includeTokenData) {
      for (const offer of offers) {
        const token = await Token.findOne({
          collectionId: offer.contractAddress,
          tokenId: offer.tokenId
        }).select('name collectionId image imageHosted _id tokenId description').exec()

        offer.token = token
      }
    }

    offers = offers.sort((a, b) => { return b.timestamp - a.timestamp })

    return res.status(200).json({ total: offers.length, results: offers })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/:address/likes', async (req, res) => {

  try {

    if (!req.params.address) return res.status(400).json({ message: 'Missing User Address Parameter..' })

    let userAddress = req.params.address
    const userLikes = await TokenLike.find({ userAddress: userAddress }).exec()

    let tokens = []
    for (const userLike of userLikes) {
      const token = await Token.findOne({ collectionId: userLike.collectionId, tokenId: userLike.tokenId })
      tokens.push(token)
    }

    res.status(200).json({ results: userLikes, tokens })


  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }

})

router.post('/me', [extractUser], async (req, res) => {
  try {
    if (!req.user?.address || !req.body) return res.status(400).json({ message: 'Missing required parameters.' })
    if (req.body.role) delete req.body.role

    if (req.body.socials?.length) {
      req.body.socials.forEach((social) => {
        social.href = sanitizeUrl(social.href)
      })
    }

    const user = await User.findOneAndUpdate({ address: req.user.address }, { ...req.body }, { upsert: true, new: true })

    return res.status(200).send(user)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get('/messages/pre-key', [extractUser], async (req, res) => {
  try {
    if (!req.user?.address) return res.status(400).json({ message: 'Missing required parameters.' })

    const preKeyBundle = await UserMessageKey.findOne({ userAddress: req.user.address })
    return res.status(200).send(preKeyBundle)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.post('/messages/pre-key', [extractUser], async (req, res) => {
  try {
    if (!req.user?.address || !req.body) return res.status(400).json({ message: 'Missing required parameters.' })

    const userKeyBundle = new UserMessageKey();
    userKeyBundle.userAddress = req.user.address;
    userKeyBundle.preKeyBundle = req.body;
    await userKeyBundle.save();

    return res.status(200).send(userKeyBundle)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router