const axios = require("axios")
const Token = require("../models/Token")
const GetProvider = require("../utils/ChainProvider")
const { addMetadata } = require("../queue/Queue")

// Holding the function signatures for unique functions for each contract
const CHECKER_ERC721 = "0x70a08231"
const CHECKER_ERC1155 = "0x4e1273f4"

// ABIs
const ABI_ERC721 = require("../abis/ERC721.json")
const ABI_ERC1155 = require("../abis/ERC1155.json")

exports.getAllForCollection = async (collectionId) => {
  try {
    if (!collectionId) throw new Error('Missing Collection Address')
    const tokens = await Token.find({ collectionId })

    return Promise.resolve(tokens)
  } catch (error) {
    return Promise.reject(error)
  }
}

function hasMethod(code, signature) {
  return code.indexOf(signature.slice(2, signature.length)) > 0
}

exports.isOwnerOfToken = async (collectionAddress, userAddress, tokenId, qty) => {
  try {
    if (!qty) qty = 1
    const token = await Token.findOne({ collectionId: collectionAddress, tokenId }).populate('tokenCollection').exec()
    if (!token || !token.tokenCollection) return { owner: '', status: false }

    const { Provider } = GetProvider(token.tokenCollection.chain)
    const code = await Provider.eth.getCode(collectionAddress)

    if (hasMethod(code, CHECKER_ERC721)) { // Is an ERC721 Contract
      const contract = new Provider.eth.Contract(ABI_ERC721, collectionAddress)
      const currentOwner = await contract.methods.ownerOf(tokenId).call()

      if (currentOwner.toLowerCase() === userAddress.toLowerCase()) return { owner: currentOwner, status: true }
      return { owner: '', status: false }
    } else if (hasMethod(code, CHECKER_ERC1155)) { // Is an ERC1155 Contract
      const contract = new Provider.eth.Contract(ABI_ERC1155, collectionAddress)
      const tokenBalance = await contract.methods.balanceOf(userAddress, tokenId).call()
      
      if (parseInt(tokenBalance) < qty) return { owner: '', status: false }
      return { owner: userAddress, status: true }
    }

  } catch (error) {
    return { owner: '', status: false }
  }
}

exports.add = async (data) => {
  try {
    if (!data.collectionId || !data.tokenId) throw new Error('Missing required data.')

    let token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId })
    if (!token) token = new Token()

    Object.entries(data).forEach(([key, val]) => {
      token[key] = val
    })

    await token.save()
    addMetadata(token._id)

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

    if (token.contractType === 'ERC721') {
      const contract = new Provider.eth.Contract(ABI_ERC721, token.collectionId)
      tokenUri = await contract.methods.tokenURI(token.tokenId).call()
  
      const owner = await contract.methods.ownerOf(token.tokenId).call()
      token.owner = owner
    } else if (token.contractType === 'ERC1155') {
      const contract = new Provider.eth.Contract(ABI_ERC1155, token.collectionId)
      tokenUri = await contract.methods.uri(token.tokenId).call()
      console.log("ERC1155 Token URI", tokenUri)
    }

    console.log('Refreshing metadata for token', token.tokenId)

    if (tokenUri) {
      if (tokenUri.startsWith('ipfs://')) tokenUri = tokenUri.replace('ipfs://', "https://gateway.ipfs.io/ipfs/")
      token.tokenUri = tokenUri
      const fetched = await axios.get(tokenUri)

      if (fetched.data) {
        token.metadata = fetched.data

        if (fetched.data.attributes) {
          // Get rarity score from collection
          token.traits = fetched.data.attributes
          let totalRarity = 0
          token.traits.forEach((trait) => {
            if (!token.tokenCollection.traits?.length) return
            const type = token.tokenCollection.traits.find((t) => t.type === trait.trait_type)
            const { rarityPercent, rarityScore, rarityRank } = type.attributes.find((a) => a.value === trait.value)

            trait.rarityPercent = rarityPercent
            trait.rarityScore = rarityScore
            trait.rarityRank = rarityRank

            totalRarity += rarityScore
          })

          token.rarity = totalRarity
          token.markModified('traits')
        }
      }
    }

    await token.save()

    return Promise.resolve(token)
 } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}

exports.logTransfer = async (data) => {
  try {
    let token = await Token.findOne({ collectionId: data.tokenAddress.toLowerCase(), tokenId: data.tokenId })
    if (!token) { 
      console.log('Token Minted, creating new')
      token = new Token() 
      token.collectionId = data.tokenAddress
      token.tokenId = data.tokenId
      token.contractType = data.contractType || 'ERC721'
    }

    if (!token.transfers) token.transfers = []
    const i = token.transfers.indexOf(data._id)
    if (i !== -1) return Promise.resolve(token)
    else token.transfers.push(data._id)

    await token.save()
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

exports.addListing = async (data) => {
  try {
    if (!data._id) throw new Error('Listing _id must be specified')
    const token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId }).populate('listings').exec()
    if (!token) throw new Error('No token found')

    const exists = token.listings.find(l => l._id.toString() === data._id.toString())
    if (!exists) {
      token.listings.push(data)
    }

    const prices = token.listings.map((l) => l.pricePerItem)
    const calc = getHighestAndLowestPrice(prices)

    token.highestPrice = calc.highestPrice
    token.lowestPrice = calc.lowestPrice

    await token.save()

    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.removeListing = async (data) => {
  try {
    const token = await Token.findOne({ collectionId: data.collectionId, tokenId: data.tokenId }).populate('listings').exec()
    if (!token) throw new Error('No token found')

    const i = token.listings.findIndex((l) => l._id.toString() === data._id.toString())
    if (i !== -1) token.listings.splice(i, 1)

    const prices = token.listings.map((l) => l.pricePerItem)
    const calc = getHighestAndLowestPrice(prices)

    token.highestPrice = calc.highestPrice
    token.lowestPrice = calc.lowestPrice

    token.markModified('listings')
    await token.save()
    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.addBid = async (data) => {
  console.log(data)
}