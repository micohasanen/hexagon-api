const router = require("express").Router()
const Token = require("../models/Token")

router.get('/', async (req, res) => {
  try {
    const tokenCheck = await Token.find().limit(1).exec()
    if (!tokenCheck.length) return res.sendStatus(404)

    return res.sendStatus(200)
  } catch (err) {
    return res.status(500).send(err)
  }
})

module.exports = router