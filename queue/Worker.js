const config = require('../config')
const { Worker, jobIdForGroup } = require("bullmq")

// Controllers
const TransferController = require("../controllers/TransferController")
const TokenController = require("../controllers/TokenController")
const CollectionController = require("../controllers/CollectionController")
const ListingController = require("../controllers/ListingController")
const BidController = require("../controllers/BidController")
const AuctionController = require("../controllers/AuctionController")

module.exports = () => {
  // Process a new transfer Event
  const transferWorker = new Worker('transfers', 
    async (job) => {
      await TransferController.add(job.data)
      return true
    }, { connection: config.redisConnection })

  // Process new Metadata refresh request
  const metadataWorker = new Worker('metadata', 
  async (job) => {
    await TokenController.refreshMetadata(job.data)
    return true
  }, { connection: config.redisConnection })

  // Process new batch reveal 
  const rarityWorker = new Worker('rarity', 
  async (job) => {
    await CollectionController.generateRarity(job.data)
    return true
  }, { connection: config.redisConnection })

  // Events from Marketplace 
  // Listings
  const listingWorker = new Worker('listings', async (job) => {
    if (job.data.eventType === 'accepted') {
      ListingController.accept(job.data)
    } else if (job.data.eventType === 'canceled') {
      ListingController.cancel(job.data)
    } else if (job.data.eventType === 'expiry') {
      ListingController.expire(job.data.id)
    }
  }, { connection: config.redisConnection })

  // Bids
  const bidWorker = new Worker('bids', async (job) => {
    if (job.data.eventType === 'accepted') {
      BidController.accept(job.data)
    } else if (job.data.eventType === 'canceled') {
      BidController.cancel(job.data)
    } else if (job.data.eventType === 'expiry') {
      BidController.expire(job.data.id)
    }
  }, { connection: config.redisConnection })

  // Auctions
  const auctionWorker = new Worker('auctions', async (job) => {
    if (job.data.eventType === 'placed') {
      AuctionController.startAuction(job.data)
    } else if (job.data.eventType === 'bid') {
      AuctionController.placeBid(job.data)
    } else if (job.data.eventType === 'concluded') {
      AuctionController.endAuction(job.data)
    } else if (job.data.eventType === 'expiry') {
      AuctionController.expire(job.data.id)
    }
  }, { connection: config.redisConnection })
}