const Transfer = require("../models/Transfer")
const Collection = require("../models/Collection")
// const { Moralis } = require("../utils/Moralis")
const { addTransfer } = require("../queue/Queue")
const Web3 = require("web3")

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

// Please, remove Moralis from my life
// exports.syncCollectionTransfers = async (address) => {
//   try {
//     if (!address) throw new Error('Missing collection address.')

//     const collection = await Collection.findOne({ address }).exec()
//     if (!collection) throw new Error('No collection found.')

//     let total = 1000
//     const batchSize = 500
//     let cursor = ''

//     for (let i = 0; i <= total; i += batchSize) {
//       const settings = {
//         address,
//         chain: collection.chain
//       }
//       if (cursor) settings.cursor = cursor

//       const transfers = await Moralis.Web3API.token.getContractNFTTransfers(settings)

//       cursor = transfers.cursor

//       total = parseInt(transfers.total)
//       console.log({ total, i })
    
//       for (const result of transfers.result) {
//         const formatted = { chain: collection.chain }
//         Object.entries(result).forEach(([key, val]) => {
//           formatted[snakeToCamel(key)] = val
//         })
//         addTransfer(formatted)
//       }
//     }

//     return Promise.resolve(true)
//   } catch (error) {
//     console.error(error.message)
//     return Promise.reject(error)
//   }
// }

exports.add = async (data) => {
  try {
    // Create a hash from transfer details to prevent collision in db
    const hash = crypto.createHash('sha256')
    .update(`${data.blockNumber}${data.fromAddress}${data.toAddress}${data.tokenId}`)
    .digest('hex')

    const exists = await Transfer.findOne({ signature: hash }).exec()
    if (!exists) {
      const transfer = new Transfer({ ...data, signature: hash })
      await transfer.save()
    }

    return Promise.resolve()
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}