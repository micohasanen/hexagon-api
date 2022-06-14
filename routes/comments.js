const router = require("express").Router()
const CommentController = require("../controllers/CommentController")
const { extractUser } = require("../middleware/VerifySignature")

router.post('/', [extractUser], CommentController.add)
router.post('/likes', [extractUser], CommentController.like)

module.exports = router