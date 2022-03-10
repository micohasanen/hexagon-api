const router = require("express").Router()
const ABI_ERC20 = require("../abis/ERC20.json")

// Models
const Bid = require("../models/Bid")
const Collection = require("../models/Collection")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")

// Web3
const GetProvider = require("../utils/ChainProvider")

async function checkBalance(chain, currency, user) { // Supports ERC20
  const { Provider } = GetProvider(chain)
  const contract = new Provider.eth.Contract(ABI_ERC20, currency)

  const balance = await contract.methods.balanceOf(user).call()

  return balance
}

router.post("/", async (req, res) => {
  try {
    const address = req.body.contractAddress || req.body.collectionId
    const user = req.body.userAddress
    const data = req.body

    if (!address || !user || !data?.pricePerItem || !data.quantity) return res.status(400).json({ message: 'Missing required data in request body.' })

    const collection = await Collection.findOne({ address: address.toLowerCase() })
    if (!collection) return res.status(404).json({ message: 'Invalid collection address.' })

    const currency = collection.currency?.contract || process.env.DEFAULT_CURRENCY
    if (!currency) throw new Error('No collection currency')

    const balance = await checkBalance(collection.chain, currency, user)

    const requiredValue = Number(data.pricePerItem) * Number(data.quantity)
    if (balance < requiredValue) return res.status(400).json({ message: 'Insufficient token balance.' })

    const bid = new Bid({ ...data, chain: collection.chain })
    bid.active = true
    await bid.save()

    res.status(200).send(bid)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.delete("/:id", [AdminOnly], async (req, res) => {
  try {
    const bid = await Bid.findOne({ _id: req.params.id })
    bid.active = false
    await bid.save()

    return res.status(204).json({ message: `Bid ${req.params.id} deleted successfully.`})
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router