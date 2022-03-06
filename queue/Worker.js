const config = require('../config')
const { Worker } = require("bullmq")

// Controllers
const TransferController = require("../controllers/TransferController")
const TokenController = require("../controllers/TokenController")

module.exports = () => {
  const transferWorker = new Worker('transfers', 
    async (job) => {
      await TransferController.add(job.data)
      return true
    }, { connection: config.redisConnection })

  const metadataWorker = new Worker('metadata', 
  async (job) => {
    await TokenController.refreshMetadata(job.data)
    return true
  }, { connection: config.redisConnection })
}