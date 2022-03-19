const Auction = require("../models/Auction")
const { expireAuction } = require("../queue/Queue")

// Controllers
const TokenController = require("../controllers/TokenController")

exports.startAuction = async (data) => {
  try {
    const auction = await Auction.findOne({ 
      collectionAddress: data.collectionAddress.toLowerCase(),
      owner: data.owner.toLowerCase(),
      tokenId: Number(data.tokenId)
    })
    if (!auction) throw new Error('No auction found')

    auction.active = true

    if (data.blockNumber) auction.blockNumber = data.blockNumber
    if (data.transactionHash) auction.transactionHash = data.transactionHash

    await auction.save()

    TokenController.logAuction(auction)
    expireAuction(auction._id, auction.expiry)

    return Promise.resolve(true)
  } catch(error) {
    return Promise.reject(error)
  }
}

// AuctionBid(address indexed collectionAddress, uint indexed tokenId, address indexed bidder, address indexed owner, uint bid);
exports.placeBid = async (data) => {
  try {
    const auction = await Auction.findOne({ 
      collectionAddress: data.collectionAddress.toLowerCase(),
      owner: data.owner.toLowerCase(),
      tokenId: Number(data.tokenId)
    })
    if (!auction) throw new Error('No auction found')

    const bid = {
      value: data.bid,
      bidder: data.bidder,
      timestamp: new Date().getTime()
    }

    auction.highestBidder = bid.bidder
    auction.highestBid = bid.value
    auction.bids.push(bid)

    await auction.save()

    // Send notification to owner

    return Promise.resolve(true)
  } catch(error) {
    return Promise.reject(error)
  }
}

exports.endAuction = async (data) => {
  try {
    const auction = await Auction.findOne({ 
      collectionAddress: data.collectionAddress.toLowerCase(),
      owner: data.owner.toLowerCase(),
      tokenId: Number(data.tokenId)
    })
    if (!auction) throw new Error('No auction found')

    auction.highestBid = data.bid
    auction.highestBidder = data.bidder
    auction.active = auction.ended = false

    await auction.save()

    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.expire = async (id) => {
  try {
    const auction = await Auction.findOne({ _id: id })
    if (!auction) throw new Error('No auction found')

    const now = new Date().getTime() / 1000
    if (auction.expiry <= now) {
      auction.active = false
      await auction.save()

      // Send notification to owner
    }

    return Promise.resolve(auction)
  } catch (error) {
    return Promise.reject(error)
  }
}