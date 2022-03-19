const config = require('../config')
const { Queue, QueueScheduler } = require("bullmq")
const { nanoid } = require("nanoid")

// Queues
const transferQueue = new Queue('transfers', { connection: config.redisConnection })
const metadataQueue = new Queue('metadata',  { connection: config.redisConnection })

new QueueScheduler('rarity', { connection: config.redisConnection })
const rarityQueue = new Queue('rarity', { connection: config.redisConnection })

new QueueScheduler('listings', { connection: config.redisConnection })
const listingsQueue = new Queue('listings', { connection: config.redisConnection })

new QueueScheduler('bids', { connection: config.redisConnection })
const bidsQueue = new Queue('bids', { connection: config.redisConnection })

new QueueScheduler('auctions', { connection: config.redisConnection })
const auctionsQueue = new Queue('auctions', { connection: config.redisConnection })

function calculateDelay (expiry, surplus = 30000) { // 30s surplus just to be safe
  const now = new Date().getTime() / 1000
  const delay = expiry - now
  const delayMs = delay * 1000 + surplus

  return delayMs < 0 ? 0 : delayMs
}

exports.addTransfer = async (data) => {
  await transferQueue.add(nanoid(), data)
}

exports.addMetadata = async (tokenIdMongo) => {
  await metadataQueue.add(nanoid(), tokenIdMongo)
}

exports.generateRarity = async (collectionAddress) => {
  console.log('Added collection to rarity queue', collectionAddress)
  await rarityQueue.remove(collectionAddress)
  await rarityQueue.add(nanoid(), collectionAddress, { delay: 30000, jobId: collectionAddress })
}

exports.expireListing = async (id, expiry) => {
  const delay = calculateDelay(expiry)
  await listingsQueue.add(nanoid(), { eventType: 'expiry', id }, { delay })
}

exports.expireBid = async (id, expiry) => {
  const delay = calculateDelay(expiry)
  await bidsQueue.add(nanoid(), { eventType: 'expiry', id }, { delay })
}

exports.expireAuction = async (id, expiry) => {
  const delay = calculateDelay(expiry)
  await auctionsQueue.add(nanoid(), { eventType: 'expiry', id }, { delay })
}
