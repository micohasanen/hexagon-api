const router = require("express").Router()
const parseDuration = require("parse-duration")

// Models
const Balance = require("../models/Balance")
const Token = require("../models/Token")
const Auction = require("../models/Auction")
const Notification = require("../models/Notification")
const User = require("../models/User")
const Transfer = require("../models/Transfer")
const Sale = require("../models/Sale")
const Listing = require("../models/Listing")
const Bid = require("../models/Bid")

// Middleware
const { extractUser } = require("../middleware/VerifySignature")

router.get('/:address', async (req, res) => {
  try {
    const user = await User.findOne({ address: req.params.address }).select('-role').exec()
    if (!user) return res.status(404).json({ message: 'No user found.' })

    return res.status(200).json({ user })
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
        $or: [ { fromAddress: address }, { toAddress: address } ]
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
        $or: [ { seller: address }, { buyer: address } ]
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

router.post('/me', [extractUser], async (req, res) => {
  try {
    if (!req.user?.address || !req.body) return res.status(400).json({ message: 'Missing required parameters.' })
    if (req.body.role) delete req.body.role

    const user = await User.findOneAndUpdate({ address: req.user.address }, { ...req.body }, { upsert: true, new: true })

    return res.status(200).send(user)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  } 
})

module.exports = router