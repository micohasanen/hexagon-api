const Auction = require("../models/Auction")

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
  } catch(error) {
    return Promise.reject(error)
  }
}