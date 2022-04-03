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

router.get("/search", async (req, res) => {
  try {
    if (!req.query.q) return res.status(200).json({ total: 0, results: [] })
    const fields = req.query.fields?.split(',') 
    || ['name', 'tokenId', 'collectionId', 'imageHosted']

    let tokens = []
    const include = {}

    fields.forEach((field) => {
      include[field] = true
    })

    if (!isNaN(req.query.q)) {
      // Check if search matches token id exactly
      tokens = await Token.find({ tokenId: req.query.q })
                              .limit(10)
                              .select(fields.join(' '))
                              .exec()
    }

    // If no match, perform a full text search
    if (!tokens.length) {
      tokens = await Token.aggregate([
        { $match: { $text: { $search: decodeURIComponent(req.query.q) } } },
        { $project: include },
        { $sort: { score: { $meta: "textScore" } } },
        { $limit: 10 }
      ])
    }

    // If still no match, perform a partial text search
    if (!tokens.length) { 
      tokens = await Token.find({
        $or: [
          { "name": new RegExp(decodeURIComponent(req.query.q), "gi") }
        ]
      }).select(fields.join(' ')).limit(10).exec()
    }

    return res.status(200).json({ total: tokens.length, results: tokens })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router