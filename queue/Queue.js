const config = require('../config')
const { Queue } = require("bullmq")
const { nanoid } = require("nanoid")

// Queues
const transferQueue = new Queue('transfers', { connection: config.redisConnection })
const metadataQueue = new Queue('metadata',  { connection: config.redisConnection })

exports.addTransfer = async (data) => {
  await transferQueue.add(nanoid(), data)
}

exports.addMetadata = async (tokenIdMongo) => {
  await metadataQueue.add(nanoid(), tokenIdMongo)
}
