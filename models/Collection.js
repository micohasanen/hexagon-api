const mongoose = require("mongoose")
const { Moralis } = require("../utils/Moralis")
const ABI_ERC721 = require("../abis/ERC721.json")
const { Provider, ethers } = require("../utils/provider")
const TokenController = require("../controllers/TokenController")
const { collection } = require("./Token")

const CollectionSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chain: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    index: true
  },
  description: String,
  images: {
    logo: {
      type: String
    },
    banner: {
      type: String
    }
  },
  symbol: String,
  totalSupply: Number,
  whitelisted: Boolean,
  pending: Boolean,
  verified: Boolean,
  socials: Array,
  traits: Array
}, { timestamps: true })


CollectionSchema.pre('save', async function (next) {
  this.address = this.address.toLowerCase()
  next()
})

CollectionSchema.post('save', function () {
  if (!this.traits?.length) {
    this.getAllTokens()
  }
})


CollectionSchema.methods.getAllTokens = async function () {
  try {
    let total = 1000
    const batchSize = 500
    for (let i = 0; i <= total; i += batchSize) {
      const tokenData = await Moralis.Web3API.token.getAllTokenIds({
        address: this.address,
        chain: this.chain,
        offset: i
      })

      total = parseInt(tokenData.total)
      console.log({ total, i })

      for (const token of tokenData.result) {
        const tempToken = {
          collectionId: this.address,
          tokenId: token.token_id,
          tokenUri: token.token_uri,
          metadata: JSON.parse(token.metadata)
        }

        TokenController.add(tempToken)
      }
    }

    this.generateAttributes()
  } catch (error) {
    throw new Error(error)
  }
}

CollectionSchema.methods.generateAttributes = async function () {
  try {
    const tokens = await TokenController.getAllForCollection(this.address)
    tokens.forEach(token => {
      if (!token.metadata || !token.metadata.attributes) return
      token.metadata.attributes.forEach(attr => {
        let traitType = 'default'
        let value = ''
        if (attr.trait_type) traitType = attr.trait_type // This is done to support some legacy collections, such as cryptopunks
        if (attr.value) value = attr.value // They don't have the standard trait_type & value schema
        else value = attr

        if (!this.traits) this.traits = []
        let trait = this.traits.find((t) => t.type === traitType)

        if (!trait) { 
          this.traits.push({ type: traitType, attributes: [], traitAmount: 0 }) 
          trait = this.traits[this.traits.length - 1]
        }

        const attribute = trait.attributes.find(a => a.value === value)
        if (attribute) { 
          trait.traitAmount += 1
          attribute.amount += 1 
        }
        else {
          trait.traitAmount += 1
          trait.attributes.push({ value, amount: 1 })
        }
      }) 
    })

    await this.save()
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = mongoose.model('Collection', CollectionSchema)