const mongoose = require("mongoose")

const Bid = require("../models/Bid")
const Listing = require("../models/Listing")
const Sale = require("../models/Sale")

exports.cancel = async (data) => {
  try {
    const bid = await Bid.findOne({ 
      contractAddress: data.nftContractAddress.toLowerCase(),
      tokenId: Number(data.tokenId),
      userAddress: data.owner.toLowerCase(),
      nonce: Number(data.nonce)
    }).exec()
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
    const contractAddress = (data.nftContractAddress || data.contractAddress).toLowerCase()
    const userAddress = (data.owner || data.seller || data.userAddress).toLowerCase()

    if (!data.buyer) throw ('Buyer is required')

    const session = await mongoose.startSession()
    session.startTransaction()
    
    const bid = await Bid.findOne({ 
      contractAddress,
      tokenId: Number(data.tokenId),
      userAddress,
      nonce: Number(data.nonce),
      active: true
    }).session(session).exec()
    if (!bid) throw new Error('No Bid found')

    bid.active = false
    bid.accepted = true
    bid.r = bid.s = 'null'
    if (data.blockNumber) bid.blockNumber = data.blockNumber
    if (data.transactionHash) bid.transactionHash = data.transactionHash
    await bid.save()

    // Since the token changes ownership, we cancel all listings as well
    const listings = await Listing.find({ 
      contractAddress, 
      tokenId: Number(data.tokenId),
      userAddress 
    }).session(session).exec()

    for (const listing of listings) {
      listing.active = false
      listing.canceled = true
      listing.r = listing.s = 'null'
      await listing.save()
    }

    const sale = new Sale({ ...data }).session(session)
    sale.collectionId = contractAddress
    sale.seller = userAddress
    sale.timestamp = new Date()
    sale.saleType = 'bid'
    sale.buyer = data.buyer
    sale.value = Number(bid.pricePerItem) * Number(bid.quantity)
    if (data.blockNumber) sale.blockNumber = data.blockNumber
    if (data.transactionHash) sale.transactionHash = data.transactionHash
    await sale.save()

    await session.commitTransaction()
    session.endSession()

    return Promise.resolve({ bid, sale })
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.expire = async (id) => {
  try {
    const bid = await Bid.findOne({ _id: id }).exec()
    if (!bid) throw new Error('No listing found')

    const now = new Date().getTime() / 1000
    if (bid.expiry <= now) { 
      bid.active = false 
      bid.r = bid.s = 'null'
      await bid.save()
    }

    return Promise.resolve(bid)
  } catch (error) {
    return Promise.reject(error)
  }
}