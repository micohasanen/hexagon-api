const Notification = require("../models/Notification")
const Collection = require("../models/Collection")
const Token = require("../models/Token")
const web3 = require("web3")

const templates = {
  sale: 'Your item, {info.tokenName}, has sold for {value} {info.currency}!',
  bid: 'New bid for {value} {info.currency} on {info.tokenName}',
  auctionEndedSold: 'Auction for {info.tokenName} has ended. Your item sold for {value} {info.currency}!',
  auctionEndedNotSold: 'Auction for {info.tokenName} has ended. Your item did not receive any bids.'
}

function resolveVariable (data, param) {
  let value = data
  const params = param.split('.')

  if (param === 'value')
    return web3.utils.fromWei(data.value.toString())

  for (const key of params) {
    value = value[key]
  }

  return value
}

exports.addNotification = async (data) => {
  try {
    if (!data.receiver) throw new Error('Receiver not specified')

    const template = templates[data.notificationType]
    console.log('Notification being sent')
    console.log(data)

    if (!data.notificationType || !template)
      throw new Error('No such notification type')

    // Get Currency if not set in request
    const collectionId = data.info?.collectionId || data.info?.collectionAddress || data.info?.contractAddress
    if (!data.info?.currency && collectionId) {
      let currency = 'HNY'

      const collection = await Collection.findOne({ address: collectionId })
      if (collection.currency?.symbol) currency = collection.currency.symbol
      
      if (!data.info) data.info = {}
      data.info.currency = currency
    }

    // Get Token info if not set in request
    if (!data.info?.tokenName && data.info.tokenId && collectionId) {
      const token = await Token.findOne({ tokenId: data.info.tokenId, collectionId })
      data.info.tokenName = token.name
      data.info.tokenImage = token.image
    }

    const re = new RegExp(/(?<={).*?(?=})/g)
    let message = template.replace(re, (match) => {
      return resolveVariable(data, match)
    })
    message = message.split('{').join('')
    message = message.split('}').join('')

    const notification = new Notification({ ...data, message })
    await notification.save()

    return Promise.resolve(notification)
  } catch (error) {
    return Promise.reject(error)
  }
}