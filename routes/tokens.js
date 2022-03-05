const router = require("express").Router()
const Token = require("../models/Token")
const Collection = require("../models/Collection")
const { Moralis } = require("../utils/Moralis")

router.put("/:id/refresh-metadata", async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'ID missing.' })

    const token = await Token.findOne({ _id: req.params.id })
    if (!token) return res.status(404).json({ message: 'No token found.' })

    const collection = await Collection.findOne({ address: token.collectionId })
    if (!collection) return res.status(404).json({ message: 'No collection found.' })

    const data = await Moralis.Web3API.token.getTokenIdMetadata({
      address: collection.address, token_id: token.tokenId, chain: collection.chain
    })

    if (data) {
      token.tokenUri = data.token_uri
      token.metadata = JSON.parse(data.metadata)
      await token.save()
    }

    return res.status(200).send(token)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router