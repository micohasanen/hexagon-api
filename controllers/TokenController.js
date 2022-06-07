const axios = require("axios")
const mongoose = require("mongoose")
const { addMetadata, generateRarity, updateCollectionPrices } = require("../queue/Queue")
const { nanoid } = require("nanoid")
const { Moralis } = require("../utils/Moralis")
const crypto = require("crypto")

// ABIs
const ABI_ERC721 = require("../abis/ERC721.json")
const ABI_ERC1155 = require("../abis/ERC1155.json")

// Models
const Token = require("../models/Token")
const Auction = require("../models/Auction")
const Balance = require("../models/Balance")
const Listing = require("../models/Listing")

// Web3
const GetProvider = require("../utils/ChainProvider")

const contractUtils = require("../utils/contractType")
const { toTwosComplement } = require("../utils/base")
const knownGateways = ['https://gateway.pinata.cloud/ipfs/', 'https://gateway.ipfs.io/ipfs/', 'https://gateway.moralisipfs.com/ipfs/']

function resolveIpfs (path) {
  for (const gateway of knownGateways) {
    if (path?.startsWith(gateway))
      console.log('matches', gateway)
      return path.replace(gateway, process.env.IPFS_GATEWAY)
  }
  if (path?.startsWith('ipfs://'))
    return path.replace('ipfs://', process.env.IPFS_GATEWAY)
  return path
}

async function updateBalances (data) {
  let owner = data.toAddress
  
  try {
    const { Provider } = GetProvider(data.chain)
    const abi = data.contractType === 'ERC1155' ? ABI_ERC1155 : ABI_ERC721
    const contract = new Provider.eth.Contract(abi, data.tokenAddress)

    // Get new balances of transfer parties
    if (data.contractType === 'ERC721') {
      owner = await contract.methods.ownerOf(data.tokenId).call()

      await Balance.updateOne({ 
        tokenId: data.tokenId, 
        collectionId: data.tokenAddress,
        chain: data.chain
      }, { address: owner, amount: 1 }, { upsert: true })

    } else if (data.contractType === 'ERC1155') {
      let balanceFrom = 0
      let balanceTo = 0

      if (!contractUtils.isZeroAddress(data.fromAddress))
        balanceFrom = await contract.methods.balanceOf(data.fromAddress, data.tokenId).call()

      if (!contractUtils.isZeroAddress(data.toAddress))
        balanceTo = await contract.methods.balanceOf(data.toAddress, data.tokenId).call()

      const createOptions = { upsert: true }

      if (!contractUtils.isZeroAddress(data.fromAddress)) {
        await Balance.updateOne({
          address: data.fromAddress,
          tokenId: data.tokenId,
          collectionId: data.tokenAddress,
          chain: data.chain
        }, { amount: balanceFrom }, createOptions)
      }

      if (!contractUtils.isZeroAddress(data.toAddress)) {
        await Balance.updateOne({
          address: data.toAddress,
          tokenId: data.tokenId,
          collectionId: data.tokenAddress,
          chain: data.chain
        }, { amount: balanceTo }, createOptions)
      }
  }

  return Promise.resolve(owner)
  } catch (error) {
    console.error(error)
    return Promise.resolve(owner)
  }
}

exports.getAllForCollection = async (collectionId) => {
  try {
    if (!collectionId) throw new Error('Missing Collection Address')
    const tokens = await Token.find({ collectionId })

    return Promise.resolve(tokens)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.isOwnerOfToken = async (collectionAddress, userAddress, tokenId, qty) => {
  try {
    if (!qty) qty = 1
    const token = await Token.findOne({ collectionId: collectionAddress, tokenId }).populate('tokenCollection').exec()
    if (!token || !token.tokenCollection) return { owner: '', status: false }

    const { Provider } = GetProvider(token.tokenCollection.chain)
    const code = await Provider.eth.getCode(collectionAddress)

    const contractType = contractUtils.getContractType(code)

    if (contractType === 'ERC721') {
      const contract = new Provider.eth.Contract(ABI_ERC721, collectionAddress)
      const currentOwner = await contract.methods.ownerOf(tokenId).call()

      if (currentOwner.toLowerCase() === userAddress.toLowerCase()) return { owner: currentOwner, status: true, contractType: 'ERC721' }
      return { owner: '', status: false, contractType: 'ERC721' }
    } else if (contractType === 'ERC1155') { // Is an ERC1155 Contract
      const contract = new Provider.eth.Contract(ABI_ERC1155, collectionAddress)
      const tokenBalance = await contract.methods.balanceOf(userAddress, tokenId).call()
      
      if (parseInt(tokenBalance) < qty) return { owner: '', status: false }
      return { owner: userAddress, status: true, contractType: 'ERC1155' }
    }

  } catch (error) {
    return { owner: '', status: false }
  }
}

exports.add = async (data) => {
  try {
    if (!data.collectionId || !data.tokenId) throw new Error('Missing required data.')

    // Prevent multiple token ids within the same collection to be stored in the db
    const tokenHash = crypto.createHash('sha256').update(`${data.collectionId.toLowerCase()}:${data.tokenId}`).digest('hex')

    let token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId })
    if (!token) {
      token = new Token({ ...data, tokenHash })
      await token.save()

      addMetadata(token._id)
    }

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.update = async (data) => {
  try {
    if (!data.collectionId || !data.tokenId) throw new Error('Missing required data.')

    const token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId })
    if (!token) throw new Error('Token not found')

    Object.entries(data).forEach(([key, val]) => {
      token[key] = val
    })
    await token.save()

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.refreshMetadata = async function (id) {
 try {
    if (!id) throw new Error('Missing required data.')

    const token = await Token.findOne({ _id: id }).populate('tokenCollection').exec()
    if (!token || !token.tokenCollection) throw new Error('No token found.')

    const { Provider } = GetProvider(token.tokenCollection.chain)
    let tokenUri = ''

    if (!token.contractType) {
      const code = await Provider.eth.getCode(token.collectionId)
      token.contractType = contractUtils.getContractType(code)
    }

    if (token.contractType === 'ERC721') {
      const contract = new Provider.eth.Contract(ABI_ERC721, token.collectionId)
      tokenUri = await contract.methods.tokenURI(token.tokenId).call()
  
      const owner = await contract.methods.ownerOf(token.tokenId).call()
      token.owner = owner
    } else if (token.contractType === 'ERC1155') {
      const contract = new Provider.eth.Contract(ABI_ERC1155, token.collectionId)
      tokenUri = await contract.methods.uri(token.tokenId).call()

      console.log(tokenUri)

      if (tokenUri.includes('{id}')) {
        tokenUri = tokenUri.replace('{id}', toTwosComplement(token.tokenId))
      }
      console.log("ERC1155 Token URI", tokenUri)
    }

    console.log('Refreshing metadata for token', token.tokenId)

    if (tokenUri) {
      if (tokenUri.startsWith('ipfs://')) tokenUri = tokenUri.replace('ipfs://', process.env.IPFS_GATEWAY)
      token.tokenUri = tokenUri

      let fetched

      if (tokenUri.startsWith('https://')) {
        fetched = await axios.get(tokenUri)
      } else {
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString('utf8')
        fetched = { data: JSON.parse(json) }
      }

      if (fetched.data) {
        if (fetched.data.image?.startsWith('ipfs://')) token.imageHosted = fetched.data.image
        else {
          // First check if is duplicate with another image
          const tokenWithSameImage = await Token.findOne({ 
            collectionId: token.collectionId, 
            image: fetched.data.image, 
            imageHosted: { $exists: true }
          })

          // If exists, duplicate details, if not, upload to ipfs
          if (tokenWithSameImage) {
            token.imageHosted = tokenWithSameImage.imageHosted
          } else {
            let image

            if (fetched.data.image.startsWith('https://')) {
              const imageReq = await axios.get(resolveIpfs(fetched.data.image), { responseType: 'arraybuffer' })
              image = imageReq.data
            } else {
              image = Buffer.from(fetched.data.image.split(',')[1], 'base64').toString('utf8')
            }
  
            const buffer = Buffer.from(image)
            const upload = new Moralis.File(`hexagon_${nanoid()}.jpg`, Array.from(buffer))
            await upload.saveIPFS({ useMasterKey: true })
            const hash = upload.hash()
            token.imageHosted = `ipfs://${hash}`
          }
        }

        token.metadata = fetched.data

        if (fetched.data.attributes) {
          // Get rarity score from collection
          token.traits = fetched.data.attributes
          let totalRarity = 0
          token.traits.forEach((trait) => {
            if (!token.tokenCollection.traits?.length) return
            const type = token.tokenCollection.traits.find((t) => t.type === trait.trait_type)
            if (!type) {
              generateRarity(token.collectionId.toLowerCase())
              return
            }
            const attr = type.attributes.find((a) => a.value === trait.value)

            if (!attr || !attr.rarityScore) { 
              // generateRarity(token.collectionId.toLowerCase())
              return 
            }
            trait.rarityPercent = attr.rarityPercent
            trait.rarityScore = attr.rarityScore
            trait.rarityRank = attr.rarityRank

            totalRarity += attr.rarityScore
          })

          token.rarity = totalRarity
          token.markModified('traits')
        }
      }
    }

    if (!token.chain) token.chain = token.tokenCollection.chain
    await token.save()

    this.syncAuctions(token)
    updateBalances({ 
      chain: token.tokenCollection.chain,
      tokenAddress: token.collectionId,
      contractType: token.tokenCollection.contractType,
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: '0x0000000000000000000000000000000000000000',
      tokenId: token.tokenId
    })

    return Promise.resolve(token)
 } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}


exports.logTransfer = async (data) => {
  try {
    let token = await Token.findOne({ collectionId: data.tokenAddress.toLowerCase(), tokenId: data.tokenId }).exec()
    if (!token) { 
      console.log('Token Minted, creating new')
      token = new Token()
      token.collectionId = data.tokenAddress
      token.tokenId = data.tokenId
      token.contractType = data.contractType || 'ERC721'
      generateRarity(data.tokenAddress.toLowerCase())
    }

    // Push transfer _id to token details
    if (!token.transfers) token.transfers = []
    const i = token.transfers.findIndex(t => t.toString() === data._id.toString())
    if (i === -1) token.transfers.push(data._id)

    let newOwner = data.toAddress

    // Update owner balances
    if (data.chain) {
      newOwner = await updateBalances(data)
    }

    if (token.contractType === 'ERC721') token.owner = newOwner
    await token.save()

    const listings = await Listing.find({
      collectionId: token.contractAddress,
      tokenId: token.tokenId,
      userAddress: data.fromAddress,
      active: true
    })
    
    for (const listing of listings) {
      listing.active = false
      await listing.save()
    }

 
    if (!token.metadata || !token.imageHosted) addMetadata(token._id)

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

function getHighestAndLowestPrice(prices) {
  if (!prices?.length) return { highestPrice: 0, lowestPrice: 0 }

  let highestPrice = Math.max(...prices)
  let lowestPrice = Math.min(...prices)

  return { highestPrice, lowestPrice }
}

function isExpired (timestamp) {
  const expiry = new Date(timestamp).getTime()
  const now = new Date().getTime()

  if (expiry < now / 1000) return true
  return false
}

exports.logListing = async (data) => {
  try {
    if (!data._id) throw new Error('Listing _id must be specified')

    const token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId })
                      .populate('listings')
                      .exec()
    if (!token) throw new Error('No token found')

    let exists = token.listings.find(l => l._id.toString() === data._id.toString())
    if (!exists) {
      token.listings.push(data)
    } else exists = data

    const prices = token.listings.filter((l) => {
      return l.active 
    }).map((l) => { 
      return l.pricePerItem 
    })
    const calc = getHighestAndLowestPrice(prices)

    token.highestPrice = calc.highestPrice
    token.lowestPrice = calc.lowestPrice

    if (data.active) token.lastListedAt = new Date()

    token.markModified('listings')
    await token.save()

    updateCollectionPrices(data.collectionId)

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.logBid = async (data) => {
  try {
    if (!data._id) throw new Error('Data _id must be specified')
    const token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId }).populate('bids').exec()
    if (!token) throw new Error('No token found')

    let exists = token.bids.find((b) => b._id.toString() === data._id.toString())
    if (!exists) token.bids.push(data)
    else exists = data

    const prices = token.bids.filter((b) => { 
      return b.active
    }).map(b => { 
      return b.pricePerItem 
    })
    const calc = getHighestAndLowestPrice(prices)

    if (
      data.active && 
      !isExpired(data.expiry) && 
      data.pricePerItem > token.highestBid
      ) { token.highestBidder = data.userAddress }

    if (!calc.highestPrice && !calc.lowestPrice) token.highestBidder = ''
    token.highestBid = calc.highestPrice
    token.lowestBid = calc.lowestPrice

    token.markModified('bids')
    await token.save()

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.syncAuctions = async (data = { collectionId: '', tokenId: null }) => {
  try {
    const token = await Token.findOne({
      tokenId: data.tokenId,
      collectionId: data.collectionId
    })

    if (!token) throw new Error('No token found')

    const auctions = await Auction.find({ 
      collectionAddress: data.collectionId,
      tokenId: data.tokenId,
      active: true 
    }).distinct('_id').exec()

    if (auctions.length) {
      token.auctions = auctions
    } else {
      token.auctions = []
    }

    token.markModified('auctions')
    await token.save()

    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.removeDuplicates = async (collectionId) => {
  try {
    const counts = await Token.aggregate([
      { $match: { collectionId: collectionId.toLowerCase() } },
      { $group: { _id: "$tokenId", count: { "$sum": 1 }}},
      { $match: { count: { $gt: 1 }}} 
    ])

    console.log(counts)

    for (const count of counts) {
      await Token.deleteOne({ tokenId: count._id, collectionId })
    }

    return Promise.resolve(true)
  } catch (error) {
    return Promise.reject(error)
  }
}