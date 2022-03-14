const config = require('../config')
const { Queue, QueueScheduler } = require("bullmq")
const { nanoid } = require("nanoid")

// Queues
const transferQueue = new Queue('transfers', { connection: config.redisConnection })
const metadataQueue = new Queue('metadata',  { connection: config.redisConnection })
new QueueScheduler('rarity', { connection: config.redisConnection })
const rarityQueue = new Queue('rarity', { connection: config.redisConnection })

exports.addTransfer = async (data) => {
  await transferQueue.add(nanoid(), data)
}

exports.addMetadata = async (tokenIdMongo) => {
  await metadataQueue.remove(tokenIdMongo)
  await metadataQueue.add(nanoid(), tokenIdMongo, { jobId: tokenIdMongo })
}

exports.generateRarity = async (collectionAddress) => {
  console.log('Added collection to rarity queue', collectionAddress)
  await rarityQueue.remove(collectionAddress)
  await rarityQueue.add(nanoid(), collectionAddress, { delay: 30000, jobId: collectionAddress })
}
