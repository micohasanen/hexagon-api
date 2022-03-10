const Bid = require("../models/Bid")
const Sale = require("../models/Sale")

exports.cancel = async (data) => {
  try {
    const bid = await Bid.findOne({ 
      contractAddress: data.nftContractAddress,
      tokenId: data.tokenId,
      userAddress: data.owner
    })
    if (!bid) throw new Error('No Bid found')

    bid.active = false
    bid.canceled = true
    bid.r = bid.s = ''
    await bid.save()

    return Promise.resolve(bid)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.accept = async (data) => {
  try {
    const contractAddress = data.nftContractAddress || data.nftContract
    const userAddress = data.owner || data.seller
    const bid = await Bid.findOne({ 
      contractAddress,
      tokenId: data.tokenId,
      userAddress
     })
    if (!bid) throw new Error('No Bid found')

    bid.active = false
    bid.accepted = true
    bid.r = bid.s = ''
    await bid.save()

    const sale = new Sale({ ...data })
    sale.collectionId = contractAddress
    sale.seller = userAddress
    sale.timestamp = new Date()
    sale.saleType = 'bid'
    await sale.save()

    return Promise.resolve({ bid, sale })
  } catch (error) {
    return Promise.reject(error)
  }
}