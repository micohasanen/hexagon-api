const mongoose = require("mongoose")
const Comment = require("./Comment")
const { sanitizeUrl } = require("../utils/base")

// ABIs
const ABI_ERC721 = require("../abis/ERC721.json")
const ABI_ERC1155 = require("../abis/ERC721.json")

// Web3
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
    lowercase: true,
    trim: true,
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
    },
    featured: {
      type: String
    }
  },
  symbol: String,
  totalSupply: Number,
  whitelisted: {
    type: Boolean, 
    index: true
  },
  pending: Boolean,
  rejected: Boolean,
  verified: Boolean,
  featured: {
    type: Boolean,
    index: true
  },
  socials: [{
    name: String,
    href: String
  }],
  rarity: {
    highest: Number,
    lowest: Number
  },
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
  categories: {
    type: [String],
    index: true
  },
  excludeFromRarity: [String],
  floorPrice: {
    type: Number,
    default: 0
  },
  averagePrice: {
    type: Number,
    default: 0
  },
  highestPrice: {
    type: Number,
    default: 0
  },
  minPrice: {
    type: Number,
    default: 0
  },
  royaltyFee: Number,
  royaltyRecipient: String
}, { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } })


CollectionSchema.pre('save', async function (next) {
  this.address = this.address.toLowerCase()

  if (this.socials?.length) {
    this.socials.forEach((social) => {
      social.href = sanitizeUrl(social.href)
    })
  }

  try {
    const { Provider } = await GetProvider(this.chain)
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

CollectionSchema.virtual("comments").get(async function () {
  const query = {
    collectionId: this.address,
    tokenId: null
  };

  const total = await Comment.countDocuments(query)
  return {
    total
  }
})

CollectionSchema.index({ name: 'text' })

const Collection = mongoose.model('Collection', CollectionSchema)
module.exports = Collection