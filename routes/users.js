const router = require("express").Router()

// Models
const Balance = require("../models/Balance")
const Token = require("../models/Token")
const Auction = require("../models/Auction")
const Notification = require("../models/Notification")
const User = require("../models/User")

// Middleware
const { extractUser } = require("../middleware/VerifySignature")

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