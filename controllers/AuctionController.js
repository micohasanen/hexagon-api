const Auction = require("../models/Auction")
const { expireAuction } = require("../queue/Queue")
const Sale = require("../models/Sale")

// Controllers
const NotificationController = require("../controllers/NotificationController")
const TokenController = require("../controllers/TokenController")

function syncAuctions (auction) {
  TokenController.syncAuctions({
    collectionId: auction.collectionAddress,
    tokenId: auction.tokenId
  })
}

exports.startAuction = async (data) => {
  try {
    const auction = await Auction.findOne({ 
      collectionAddress: data.collectionAddress.toLowerCase(),
      owner: data.owner.toLowerCase(),
      tokenId: Number(data.tokenId),
      active: true
    })
    if (!auction) throw new Error('No auction found')

    auction.active = true

    if (data.blockNumber) auction.blockNumber = data.blockNumber
    if (data.transactionHash) auction.transactionHash = data.transactionHash

    await auction.save()

    expireAuction(auction._id, auction.expiry)
    syncAuctions(auction)

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
      tokenId: Number(data.tokenId),
      active: true
    })
    if (!auction) throw new Error('No auction found')

    const bid = {
      value: data.bid,
      bidder: data.bidder,
      timestamp: new Date().getTime() / 1000
    }

    auction.highestBidder = bid.bidder
    auction.highestBid = bid.value
    auction.bids.push(bid)

    await auction.save()

    NotificationController.addNotification({
      notificationType: 'auctionBid',
      receiver: auction.owner,
      sender: bid.bidder,
      value: bid.value,
      info: auction
    })

    syncAuctions(auction)

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
      tokenId: Number(data.tokenId),
      active: true
    })
    if (!auction) throw new Error('No auction found')

    auction.highestBid = data.bid
    auction.highestBidder = data.bidder
    auction.active = false
    auction.ended = true

    await auction.save()

    syncAuctions(auction)

    if (data.bid && Number(data.bid) > 0) {
      const sale = new Sale({
        ...data,
        timestamp: new Date(),
        seller: data.owner,
        buyer: data.bidder,
        saleType: 'auction',
        collectionId: data.collectionAddress,
        value: data.bid
      })
  
      console.log('Auction Sale')
      console.log(sale)
  
      await sale.save()
    }

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
      auction.ended = true
      await auction.save()

      syncAuctions(auction)

      // Send notification to owner?
    }

    return Promise.resolve(auction)
  } catch (error) {
    return Promise.reject(error)
  }
}