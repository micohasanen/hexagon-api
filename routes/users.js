const router = require("express").Router()
const Balance = require("../models/Balance")
const Token = require("../models/Token")
const Auction = require("../models/Auction")

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
      owner: req.params.address
    })

    const results = []
    for (const balance of balances) {
      const token = await Token.findOne({ collectionId: balance.collectionId, tokenId: balance.tokenId }).select('-traits -metadata')
      results.push(token)
    }

    const auctioned = []
    for (const item of auctionedItems) {
      const token = await Token.findOne({ collectionId: item.collectionAddress, tokenId: item.tokenId }).select('-traits -metadata')
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
    return res.status(500).json({ message: 'Something went wrong.' })
  }
})

module.exports = router