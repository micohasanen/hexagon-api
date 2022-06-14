const Comment = require("../models/Comment")
const  ObjectID = require('mongodb').ObjectId;

exports.add = async (req, res) => {
  const { collectionId, tokenId, message,replyTo } = req.body
  const userAddress = req.user.address

  
  try {
    const comment = new Comment({
      message,
      collectionId,
      tokenId,
      userAddress,
      timestamp: new Date()
    })

    let commentSaved = await comment.save()

    if(replyTo) {
        const originalComment = await Comment.findOne({_id: ObjectID(replyTo)})
      if (!originalComment) throw new Error('No Comment found')
      await Comment.updateOne({ _id: ObjectID(replyTo)}, { $push: { replies: commentSaved._id } })
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
  let commentLike = await Comment.findOne({ _id: ObjectID(commentId)})
  
  if (commentLike) {
    let userFound = commentLike.likes.users.includes(userAddress)
    if(userFound) {
      await Comment.updateOne({ _id: ObjectID(commentId)}, { $pull: { "likes.users": userAddress }, $inc: { "likes.count": -1 } })
    } else {
      await Comment.updateOne({ _id: ObjectID(commentId)}, { $push: { "likes.users": userAddress }, $inc: { "likes.count": 1 } })
    }

  } else {
    return res.status(500).json({ code: 500, message: 'Something went wrong.' })
  }   
  
  
  const comment = await Comment.findOne({_id: ObjectID(commentId)})
  if (!comment) throw new Error('No Comment found')
  
    return res.status(200).json({ message: 'Comment like operation successfull.', comment })
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
    tokenId: tokenId || null
  }

  const total = await Comment.countDocuments(query)
  const comments = await Comment.find(query)
  .limit(size).skip(page * size)
  .populate('replies')
  .exec()

  return res.status(200).json({ page, size, total, results: comments })
}