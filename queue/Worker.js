const config = require('../config')
const { Worker } = require("bullmq")

// Controllers
const TransferController = require("../controllers/TransferController")
const TokenController = require("../controllers/TokenController")
const CollectionController = require("../controllers/CollectionController")
const ListingController = require("../controllers/ListingController")
const BidController = require("../controllers/BidController")

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

  const listingWorker = new Worker('listings', async (job) => {
    if (job.data.eventType === 'accepted') {
      ListingController.accept(job.data)
    } else if (job.data.eventType === 'canceled') {
      ListingController.cancel(job.data)
    }
  }, { connection: config.redisConnection })
}