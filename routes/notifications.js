const router = require("express").Router()
const NotificationController = require("../controllers/NotificationController")

router.post('/', async (req, res) => {
  try {
    NotificationController.addNotification(req.body)
    return res.sendStatus(200)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router