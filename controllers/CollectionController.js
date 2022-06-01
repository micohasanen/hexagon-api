const { nanoid } = require("nanoid")
const Collection = require("../models/Collection")
const Token = require("../models/Token")
const Listing = require("../models/Listing")

const { Moralis } = require("../utils/Moralis")
const TokenController = require("../controllers/TokenController")
const SendMail = require("../utils/SendMail")

exports.add = async (data) => {
  try {
    if (!data.address || !data.name) throw new Error('Missing required parameters.')
    const collection = new Collection()
    Object.entries(data).forEach(([key, val]) => {
      collection[key] = val
    })
    await collection.save()

    return Promise.resolve(collection)
  } catch (error) {
    return Promise.reject(error)
  }
}

exports.syncTokens = async (collection) => {
  try {
    const { address, chain } = collection
    let total = 1
    const batchSize = 500
    let processed = 0
    let contractType = ''

    let cursor = ''

    for (let i = 0; i < Math.ceil(total / batchSize); i++) {
      const settings = {
        address,
        chain
      }
      if (cursor) settings.cursor = cursor

      const tokenData = await Moralis.Web3API.token.getAllTokenIds(settings)

      total = parseInt(tokenData.total)
      cursor = tokenData.cursor

      if (!total) return
      console.log({ address, total, i })

      for (const token of tokenData.result) {
        const tempToken = {
          collectionId: address,
          tokenId: token.token_id,
          tokenUri: token.token_uri,
          contractType: token.contract_type,
          metadata: JSON.parse(token.metadata)
        }

        contractType = token.contractType

        TokenController.add(tempToken)
        processed += 1
        if (processed === total) {
          totalSupply = total
          if (!collection.contractType) collection.contractType = contractType

          await collection.save()

          return Promise.resolve(true)
        }
      }
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

// Using Rarity Score Method, as described here:
// https://raritytools.medium.com/ranking-rarity-understanding-rarity-calculation-methods-86ceaeb9b98c
exports.generateRarity = async (address) => {
  try {
    const collection = await Collection.findOne({ address }).exec()
    if (!collection) throw new Error('No collection found.')

    console.log('Rarity generation started for' , address)
    const excluded = collection.excludeFromRarity || []

    const tokens = await Token.find({ collectionId: address }).exec()
    if (tokens.length) collection.traits = []
    const traits = collection.traits

    // Just adding trait counts together, no fancy calculation yet
    tokens.forEach((token) => {
      if (!token.traits?.length) return
      for (const attr of token.traits) {
        if (!attr.trait_type || !attr.value) continue

        let trait = collection.traits.find((t) => t.type === attr.trait_type)
        if (!trait) {
          const traitModel = { type: attr.trait_type, attributes: [], traitCount: 0 }
          if (attr.display_type) traitModel.display_type = attr.display_type

          traits.push(traitModel)
          trait = traits[traits.length - 1]
        }

        if (typeof attr.value === 'number') {
          trait.isNumeric = true
          if (!trait.maxValue) trait.maxValue = attr.value
          if (!trait.minValue) trait.minValue = attr.value

          if (attr.value > trait.maxValue) trait.maxValue = attr.value
          if (attr.value < trait.minValue) trait.minValue = attr.value
        }

        const attribute = trait.attributes.find(a => a.value === attr.value)
        if (attribute) {
          attribute.count += 1
          trait.traitCount += 1
        } else {
          trait.traitCount += 1
          if (!excluded.includes(attr.trait_type) & attr.display_type !== 'date')
            trait.attributes.push({ value: attr.value, count: 1, id: nanoid() })
        }
      }
    })

    // Calculate Trait Rarity
      const qty = tokens.length
      let scores = []
      traits.forEach((trait) => {
        if (!excluded.includes(trait.type)) {
          for (const attr of trait.attributes) {
            attr.rarityPercent = attr.count / qty * 100
            attr.rarityFractional = attr.rarityPercent * 0.01
            attr.rarityScore = 1 / attr.rarityFractional
            scores.push(attr)
          }
        }

        scores = scores.sort((a, b) => { return b.rarityScore - a.rarityScore })

        // Get Rarity Rank for each trait
        for (const attr of trait.attributes) {
          const rank = scores.indexOf(attr) // <- No collision possibility because of id added before
          if (rank !== -1) attr.rarityRank = rank + 1
        }
      })

    const rarity = {
      highest: 0,
      lowest: 0
    }

    // While we're at it, calculate each NFTs rarity, starting with rarity score
    let tokenScores = []
    tokens.forEach((token) => {
      let totalRarity = 0
      for (const attr of token.traits) {
        if (!attr.trait_type || !attr.value) continue

        const type = traits.find((t) => t.type === attr.trait_type)
        const attribute = type.attributes.find((a) => a.value === attr.value)
        if (!attribute) continue

        attr.rarityPercent = attribute.rarityPercent
        attr.rarityScore = attribute.rarityScore
        attr.rarityRank = attribute.rarityRank
        totalRarity += attribute.rarityScore
      }

      token.rarity = totalRarity

      if (rarity.highest < totalRarity) rarity.highest = totalRarity
      if (!rarity.lowest || rarity.lowest > totalRarity) rarity.lowest = totalRarity

      token.markModified('traits')
      tokenScores.push({ _id: token._id, rarity: token.rarity })
    })

    tokenScores = tokenScores.sort((a, b) => { return b.rarity - a.rarity })

    // And finally, get token rarity rank
    for (const token of tokens) {
      const rank = tokenScores.findIndex((s) => s._id === token._id)
      if (rank !== -1) token.rarityRank = rank + 1

      await token.save()
    }

    console.log(rarity)

    collection.rarity = rarity
    collection.markModified('rarity')
    await collection.save()

    return Promise.resolve(collection)
  } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}

exports.updatePrices = async (address) => {
  try {
    let prices = await Listing.aggregate([
      { $match: { contractAddress: address, active: true }},
      { $group: { 
        _id: "$collectionId", 
        floorPrice: { $min: "$pricePerItem" },
        averagePrice: { $avg: "$pricePerItem" },
        highestPrice: { $max: "$pricePerItem" }
      }}
    ])

    if (!prices.length) return Promise.resolve([])
    
    delete prices[0]._id
    await Collection.findOneAndUpdate({ address }, { ...prices[0] })

    return Promise.resolve(prices)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
} 

exports.sendAddedMail = async (collection) => {
  try {
    const rejectKeys = [
      'volume', 'sales', '_id', 'floorPrice', 'averagePrice',
      'highestPrice', 'minPrice', "whitelisted", "pending", "__v",
      'traits', 'excludeFromRarity', 'slug', 'categories'
    ]

    let mailHtml = '<table><tbody>'

    Object.entries(collection).forEach(([key, value]) => {
      let header = key
      let content = value

      if (rejectKeys.includes(key)) return

      if (key === 'socials') {
        for (const social of value) {
          header = `Socials: ${social.name}`
          content = social.href

          mailHtml += `<tr><td>${header}</td><td>${content}</td></tr>`
        }
      }

      if (key === 'socials') return

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        console.log(value)
        Object.entries(value).forEach(([k, v]) => {
          header = `${key}.${k}`
          content = v

          mailHtml += `<tr><td>${header}</td><td>${content}</td></tr>`
        })
      } else {
        header = header[0].toUpperCase() + header.substring(1, header.length)
        mailHtml += `<tr><td>${header}</td><td>${content}</td></tr>`
      }
  })

  mailHtml += '</tbody></table>'
  mailHtml += '<br><strong>Pro Tip:</strong> You can easily view images in IPFS by replacing ipfs:// with https://cdn.hive.investments/'

  await SendMail({ to: 'team@hive.investments', subject: 'New collection posted to Hexagon', html: mailHtml})

  } catch (error) {
    console.error(error)
    return Promise.reject(error.message)
  }

}

/*
exports.syncChain = async () => {
  try {
    const collections = await Collection.find().skip(1)
    
    for (const collection of collections) {
      for await (const token of Token.find({ collectionId: collection.address })) {
        console.log({ address: collection.address, tokenId: token.tokenId })
        token.chain = collection.chain
        token.save()
      }
    }

    return Promise.resolve(true)
  } catch (error) {
    console.error(error)
    return Promise.reject(error.message)
  }
}
*/