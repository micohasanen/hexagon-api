const Comment = require("../models/Comment")

exports.add = async (req, res) => {
  const { collectionId, tokenId, message, replyTo } = req.body
  const userAddress = req.user.address

  try {
    const comment = new Comment({
      message,
      collectionId,
      tokenId,
      userAddress,
      timestamp: new Date(),
      isReply: !!replyTo
    })

    await comment.save()

    if(!!replyTo) {
      const originalComment = await Comment.findOne({ _id: replyTo })
      if (!originalComment) throw new Error('No Comment found')

      await Comment.updateOne({ _id: replyTo }, { $push: { replies: comment._id } })
    } 
    
    return res.status(200).json({ message: 'Comment posted successfully.', comment })
  } catch (error) {
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }
}

exports.like = async (req, res) => {
  const { commentId } = req.body
  const userAddress = req.user.address

  try {
    let comment = await Comment.findOne({ _id: commentId })
    if (!comment) return res.status(404).json({ code: 404, message: 'No comment found.' })
    
    const userFound = comment.likes?.users?.includes(userAddress)
    if (userFound) {
      await Comment.updateOne({ _id: commentId }, { 
        $pull: { "likes.users": userAddress }, 
        $inc: { "likes.count": -1 } 
      })
    } else {
      await Comment.updateOne({ _id: commentId }, { 
        $push: { "likes.users": userAddress }, 
        $inc: { "likes.count": 1 } 
      })
    }

    comment = await Comment.findOne({ _id: commentId })
    
    return res.status(200).json({ message: 'Comment liked successfully.', comment })
  } catch (error) {
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }
}

exports.get = async (req, res) => {
  const page = Number(req.query.page) || 0
  let size = Number(req.query.size) || 20

  if (size > 50) size = 50

  const { collectionId, tokenId } = req.params
  const query = {
    collectionId,
    tokenId: tokenId || null,
    isReply: { $in: [false, null] }
  }

  const total = await Comment.countDocuments(query)
  const comments = await Comment.find(query)
  .limit(size).skip(page * size)
  .populate('replies user')
  .exec()

  return res.status(200).json({ page, size, total, results: comments })
}