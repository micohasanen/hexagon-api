const mongoose = require("mongoose")
const { generateRarity } = require("../queue/Queue")

// ABIs
const ABI_ERC721 = require("../abis/ERC721.json")
const ABI_ERC1155 = require("../abis/ERC721.json")

// Holding the function signatures for unique functions for each contract
const CHECKER_ERC721 = "0x70a08231"
const CHECKER_ERC1155 = "0x4e1273f4"

// Controllers
const TokenController = require("../controllers/TokenController")

// Web3
const { Moralis } = require("../utils/Moralis")
const GetProvider = require("../utils/ChainProvider")
const contractType = require("../utils/contractType")

const TotalingSchema = {
  total: {
    type: Number,
    default: 0
  },
  day: {
    type: Number,
    default: 0
  },
  week: {
    type: Number,
    default: 0
  },
  month: {
    type: Number,
    default: 0
  },
  default: {}
}

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
  socials: [{
    name: String,
    href: String
  }],
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
  },
  volume: TotalingSchema,
  sales: TotalingSchema,
  categories: [{
    id: String,
    name: String
  }]
}, { timestamps: true })


CollectionSchema.pre('save', async function (next) {
  this.address = this.address.toLowerCase()

  try {
    const { Provider } = GetProvider(this.chain)
    const code = await Provider.eth.getCode(this.address)

    if (!this.contractType) {
      const type = contractType.getContractType(code)
      this.contractType = type
    }
    const abi = this.contractType === 'ERC1155' ? ABI_ERC1155 : ABI_ERC721
    const contract = new Provider.eth.Contract(abi, this.address)

    if (!this.name || this.name === 'WhitelistedCollection') {
      if (contractType.hasMethod(code, contract.methods.name().encodeABI()))
        this.name = await contract.methods.name().call()
    }
    if (!this.symbol) {
      if (contractType.hasMethod(code, contract.methods.symbol().encodeABI()))
        this.symbol = await contract.methods.symbol().call()
    } 
    // We are checking if the contract has a totalSupply method, otherwise we'll get an error
    const supplyABI = contract.methods.totalSupply().encodeABI()
    if(contractType.hasMethod(code, supplyABI))
      this.totalSupply = await contract.methods.totalSupply().call()

    // We are checking if the contract has an owner method before adding the owner
    const ownerABI = contract.methods.owner().encodeABI()
    if(contractType.hasMethod(code, ownerABI))
      this.owner = await contract.methods.owner().call()

    next()
  } catch (error) {
    console.error(error)
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
          this.totalSupply = total
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

CollectionSchema.index({ name: 'text' })

const Collection = mongoose.model('Collection', CollectionSchema)
module.exports = Collection