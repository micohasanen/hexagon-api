const Token = require("../models/Token")

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

exports.logTransfer = async (data) => {
  try {
    let token = await Token.findOne({ collectionId: data.tokenAddress, tokenId: data.tokenId })
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