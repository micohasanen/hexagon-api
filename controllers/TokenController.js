const axios = require("axios")
const Token = require("../models/Token")
const GetProvider = require("../utils/ChainProvider")
const ABI_ERC721 = require("../abis/ERC721.json")

exports.getAllForCollection = async (collectionId) => {
  try {
    if (!collectionId) throw new Error('Missing Collection Address')
    const tokens = await Token.find({ collectionId })

    return Promise.resolve(tokens)
  } catch (error) {
    return Promise.reject(error)
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