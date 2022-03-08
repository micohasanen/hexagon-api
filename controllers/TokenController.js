const axios = require("axios")
const Token = require("../models/Token")
const GetProvider = require("../utils/ChainProvider")

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

    const exists = await Token.exists({ collectionId: data.collectionId, tokenId: data.tokenId })
    if (exists) throw new Error('Token already exists')

    const token = new Token()
    Object.entries(data).forEach(([key, val]) => {
      token[key] = val
    })

    if (token.tokenUri) {
      const fetched = await axios.get(token.tokenUri)

      if (fetched.data) {
        token.metadata = fetched.data
      }
    }

    await token.save()

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
    const contract = new Provider.eth.Contract(ABI_ERC721, token.collectionId)

    let tokenUri = await contract.methods.tokenURI(token.tokenId).call()
    if (tokenUri.startsWith('ipfs://')) tokenUri = tokenUri.replace('ipfs://', "https://gateway.ipfs.io/ipfs/")

    console.log('Refreshing metadata for token', token.tokenId)

    if (tokenUri) {
      token.tokenUri = tokenUri
      const fetched = await axios.get(tokenUri)

      if (fetched.data) {
        token.metadata = fetched.data
        await token.save()
      }
    }

    return Promise.resolve(token)
 } catch (error) {
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
    }

    if (!token.transfers) token.transfers = []
    let exists = token.transfers.find((t) => t.signature === data.signature)
    if (exists) exists = data
    else token.transfers.push(data)

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