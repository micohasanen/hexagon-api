const router = require("express").Router()
const AdminOnly = require("../middleware/Auth_AdminOnly")

router.post("/test", [AdminOnly], (req, res) => {
  return res.send('Auth OK')
})

module.exports = router