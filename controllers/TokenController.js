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

exports.logTransfer = async (data) => {
  try {
    console.log(data)
    const token = await Token.findOne({ collectionId: data.token_address, tokenId: data.token_id })
    if (!token) throw new Error('No token found')

    if (!token.transfers) token.transfers = []
    const exists = token.transfers.find((t) => t.transaction_hash === data.transaction_hash)
    if (exists) exists = data
    else token.transfers.push(data)

    await token.save()
    return Promise.resolve(token)
  } catch (error) {
    return Promise.reject(error)
  }
}