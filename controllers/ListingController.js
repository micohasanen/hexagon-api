const Listing = require("../models/Listing")
const Sale = require("../models/Sale")

// Cancel with data that came from contract event
exports.cancel = async (data) => {
  try {
    const listing = await Listing.findOne({ 
      contractAddress: data.nftContractAddress,
      tokenId: data.tokenId,
      userAddress: data.owner
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
    const userAddress = data.owner || data.seller
    const listing = await Listing.findOne({ 
      contractAddress,
      tokenId: data.tokenId,
      userAddress
     })
    if (!listing) throw new Error('No Listing found')

    listing.active = false
    listing.accepted = true
    listing.r = listing.s = ''
    await listing.save()

    const sale = new Sale({ ...data })
    sale.collectionId = contractAddress
    sale.seller = userAddress
    sale.timestamp = new Date()
    sale.saleType = 'listing'
    await sale.save()

    return Promise.resolve({ listing, sale })
  } catch (error) {
    return Promise.reject(error)
  }
}