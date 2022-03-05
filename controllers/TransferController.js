const Transfer = require("../models/Transfer")
const Collection = require("../models/Collection")
const { Moralis } = require("../utils/Moralis")

exports.syncCollectionTransfers = async (address) => {
  try {
    if (!address) throw new Error('Missing collection address.')

    const collection = await Collection.findOne({ address })
    if (!collection) throw new Error('No collection found.')

    let total = 1000
    const batchSize = 500

    for (let i = 0; i <= total; i += batchSize) {
      const transfers = await Moralis.Web3API.token.getContractNFTTransfers({
        address,
        chain: collection.chain,
        offset: i
      })

      total = parseInt(transfers.total)
      console.log({ total, i })
    
      for (const result of transfers.result) {
        const exists = await Transfer.exists({ transaction_hash: result.transaction_hash })
        if (!exists) {
          const transfer = new Transfer()
          Object.entries(result).forEach(([key, val]) => {
            transfer[key] = val
          })
          await transfer.save()
        }
      }
    }

    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}