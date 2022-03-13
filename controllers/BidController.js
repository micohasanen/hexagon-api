const Bid = require("../models/Bid")
const Listing = require("../models/Listing")
const Sale = require("../models/Sale")

exports.cancel = async (data) => {
  try {
    const bid = await Bid.findOne({ 
      contractAddress: data.nftContractAddress,
      tokenId: data.tokenId,
      userAddress: data.owner,
      nonce: data.nonce
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
      userAddress,
      nonce: data.nonce,
      active: true
     })
    if (!bid) throw new Error('No Bid found')

    bid.active = false
    bid.accepted = true
    bid.r = bid.s = 'null'
    await bid.save()

    // Since the token changes ownership, we cancel all listings as well
    const listings = await Listing.find({ 
      contractAddress, 
      tokenId: data.tokenId,
      userAddress 
    })

    for (const listing of listings) {
      listing.active = false
      listing.canceled = true
      listing.r = listing.s = 'null'
      await listing.save()
    }

    const sale = new Sale({ ...data })
    sale.collectionId = contractAddress
    sale.seller = userAddress
    sale.timestamp = new Date()
    sale.saleType = 'bid'
    sale.buyer = data.buyer
    sale.value = Number(bid.pricePerItem) * Number(bid.quantity)
    await sale.save()

    return Promise.resolve({ bid, sale })
  } catch (error) {
    return Promise.reject(error)
  }
}