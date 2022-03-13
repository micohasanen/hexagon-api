const router = require("express").Router()
const { addMetadata } = require("../queue/Queue") 

router.put("/:id/refresh-metadata", async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'ID missing.' })
    addMetadata(req.params.id)
    return res.status(200).json({ message: 'Metadata refresh queued successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router