const mongoose = require("mongoose")
const { Moralis } = require("../utils/Moralis")
const TokenController = require("../controllers/TokenController")
const { generateRarity } = require("../queue/Queue")
const ABI_ERC721 = require("../abis/ERC721.json")
const GetProvider = require("../utils/ChainProvider")

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
    index: true,
    unique: true
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
  traits: Array,
  owner: { 
    type: String,
    lowercase: true,
    trim: true
  },
  contractType: String,
  currency: {
    contract: {
      type: String,
      lowercase: true,
      trim: true
    },
    symbol: String,
    name: String,
    decimals: Number
  }
}, { timestamps: true })

function hasMethod(code, signature) {
  return code.indexOf(signature.slice(2, signature.length)) > 0
}


CollectionSchema.pre('save', async function (next) {
  this.address = this.address.toLowerCase()

  try {
    const { Provider } = GetProvider(this.chain)
    const contract = new Provider.eth.Contract(ABI_ERC721, this.address)
    
    const code = await Provider.eth.getCode(this.address)

    if (!this.name || this.name === 'WhitelistedCollection') {
      this.name = await contract.methods.name().call()
    }
    if (!this.symbol) {
      this.symbol = await contract.methods.symbol().call()
    } 
    // We are checking if the contract has a totalSupply method, otherwise we'll get an error
    if(hasMethod(code, contract.methods.totalSupply().encodeABI())) {
      console.log('Getting collection supply')
      this.totalSupply = await contract.methods.totalSupply().call()
    }
    if (!this.owner) {
      // We are checking if the contract has an owner method before adding the owner
      const methodABI = contract.methods.owner().encodeABI()
      if(hasMethod(code, methodABI)) {
        console.log('Getting collection owner')
        this.owner = await contract.methods.owner().call()
      }
    }

    next()
  } catch (error) {
    next()
  }
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
    let processed = 0
    let contractType = ''
    for (let i = 0; i <= total; i += batchSize) {
      const tokenData = await Moralis.Web3API.token.getAllTokenIds({
        address: this.address,
        chain: this.chain,
        offset: i
      })

      total = parseInt(tokenData.total)
      if (!total) return
      console.log({ total, i })

      for (const token of tokenData.result) {
        const tempToken = {
          collectionId: this.address,
          tokenId: token.token_id,
          tokenUri: token.token_uri,
          contractType: token.contract_type,
          metadata: JSON.parse(token.metadata)
        }

        contractType = token.contractType

        TokenController.add(tempToken)
        processed += 1
        if (processed === total) {
          if (!this.totalSupply) this.totalSupply = total
          if (!this.contractType) this.contractType = contractType

          await this.save()

          generateRarity(this.address)
        }
      }
    }
  } catch (error) {
    throw new Error(error)
  }
}

const Collection = mongoose.model('Collection', CollectionSchema)
module.exports = Collection