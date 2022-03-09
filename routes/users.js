const router = require("express").Router()
const { Moralis } = require("../utils/Moralis")
const Collection = require("../models/Collection")
const Token = require("../models/Token")

router.get("/:address/tokens", async (req, res) => {
  try {
    const chain = req.query.chain || 'mumbai'

    const whitelisted = await Collection.find({ chain, whitelisted: true })
    const searches = []

    // There is an edge case where not all NFTs are returned if user owns more than 500 in a single collection
    // And not very optimised yet, will come back to this
    for (const collection of whitelisted) {
      const options = { token_address: collection.address, address: req.params.address, chain }
      const tokens = await Moralis.Web3API.account.getNFTsForContract(options)

      searches.push({ collectionId: collection.address, tokenId: { $in: [] } })
      const i = searches.length - 1

      tokens.result.forEach((res) => {
        searches[i].tokenId.$in.push(res.token_id)
      })
    }

    const results = []
    let total = 0

    for (const search of searches) {
      if (!search.tokenId.$in.length) continue
      const count = await Token.countDocuments(search)
      total += count
      const tokens = await Token.find(search)
      results.push(...tokens)
    }

    return res.status(200).json({ total, results })

  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.' })
  }
})

module.exports = router