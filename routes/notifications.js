const router = require("express").Router()
const Notification = require("../models/Notification")
const NotificationController = require("../controllers/NotificationController")

// Middleware
const AdminOnly = require("../middleware/Auth_AdminOnly")

router.post('/', [AdminOnly], async (req, res) => {
  try {
    NotificationController.addNotification(req.body)
    return res.sendStatus(200)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

router.put('/:id/mark-as-read', async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ message: 'Invalid request.' })

    await Notification.findOneAndUpdate({ _id: req.params.id }, { read: true, readTime: new Date() })

    return res.sendStatus(200)
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router