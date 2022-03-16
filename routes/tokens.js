const router = require("express").Router()
const { addMetadata } = require("../queue/Queue") 
const Token = require("../models/Token")

router.put("/:id/refresh-metadata", async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'ID missing.' })
    addMetadata(req.params.id)
    return res.status(200).json({ message: 'Metadata refresh queued successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.get("/test", async (req, res) => {
  const token = await Token.findOne({ 
    collectionId: '0xccc160f8cb0fc34eeba4725a8166598f1249069b', tokenId: 105 }).populate('listings').exec()

  console.log(token)

  res.sendStatus(200)
})

module.exports = router