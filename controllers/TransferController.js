const Transfer = require("../models/Transfer")
const Collection = require("../models/Collection")
const { Moralis } = require("../utils/Moralis")
const { Provider } = require("../utils/Web3Provider")
const ERC721 = require("../abis/ERC721.json")
const crypto = require("crypto")

const snakeToCamel = str =>
  str.toLowerCase().replace(/([-_][a-z])/g, group =>
    group
      .toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );

exports.syncTransfers = async (address) => {
  try {

  } catch (error) {
    return Promise.reject(error)
  }
}

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
        const formatted = {}
        Object.entries(result).forEach(([key, val]) => {
          formatted[snakeToCamel(key)] = val
        })
        this.add(formatted)
      }
    }

    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.add = async (data) => {
  const hash = crypto.createHash('sha256')
  .update(`${data.blockTimestamp || data.blockNumber}${data.fromAddress}${data.toAddress}${data.tokenId}`)
  .digest('hex')

  console.log(hash)

  const exists = await Transfer.exists({ signature: hash })
  if (!exists) {
    const transfer = new Transfer()
    transfer.signature = hash
    Object.entries(data).forEach(([key, val]) => {
      transfer[key] = val
    })
    await transfer.save()
  }
}