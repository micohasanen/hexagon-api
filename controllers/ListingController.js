const Listing = require("../models/Listing")
const Bid = require("../models/Bid")
const Sale = require("../models/Sale")

// Cancel with data that came from contract event
exports.cancel = async (data) => {
  try {
    const listing = await Listing.findOne({ 
      contractAddress: data.nftContractAddress,
      tokenId: data.tokenId,
      userAddress: data.owner,
      nonce: data.nonce
    })
    if (!listing) throw new Error('No Listing found')

    listing.active = false
    listing.canceled = true
    listing.r = listing.s = ''
    await listing.save()

    return Promise.resolve(listing)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.accept = async (data) => {
  try {
    const contractAddress = data.nftContractAddress || data.nftContract
    const userAddress = data.owner || data.seller || data.userAddress
    const listing = await Listing.findOne({ 
      contractAddress,
      tokenId: data.tokenId,
      userAddress,
      nonce: data.nonce
     })
    if (!listing) throw new Error('No Listing found')
    if (!listing.active) throw new Error('Listing is not active')

    listing.active = false
    listing.accepted = true
    listing.r = listing.s = 'null'
    await listing.save()

    // Token changes ownership so we remove all bids
    // This is because the signatures will not work anymore if the owner changes

    const bids = await Bid.find({
      contractAddress,
      tokenId: data.tokenId,
      userAddress
    })

    for (const bid of bids) {
      bid.active = false
      bid.canceled = true
      bid.r = bid.s = 'null'
      await bid.save()
    }

    const sale = new Sale({ ...data })
    sale.collectionId = contractAddress
    sale.seller = userAddress
    sale.timestamp = new Date()
    sale.saleType = 'listing'
    sale.buyer = data.buyer
    sale.value = Number(listing.pricePerItem) * Number(listing.quantity)
    await sale.save()

    return Promise.resolve({ listing, sale })
  } catch (error) {
    return Promise.reject(error)
  }
}