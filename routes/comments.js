const router = require("express").Router()
const CommentController = require("../controllers/CommentController")
const { extractUser } = require("../middleware/VerifySignature")

router.post('/', [extractUser], CommentController.add)

module.exports = router