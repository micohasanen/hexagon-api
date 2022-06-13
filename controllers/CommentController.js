const Comment = require("../models/Comment")

exports.add = async (req, res) => {
  const { collectionId, tokenId, message,replyTo, userAddress } = req.body
  //const userAddress = req.user.address

  try {
    const comment = new Comment({
      message,
      collectionId,
      tokenId,
      userAddress,
      timestamp: new Date()
    })

    let commentSaved = await comment.save()
   // console.log(commentSaved)
   // console.log(commentSaved.id)
   // console.log(commentSaved._id)
    if(replyTo) {
      console.log("IN")

      const originalComment = await Comment.findOne({ 
        "_id": ObjectId(replyTo)
      })
      console.log(originalComment)

      if (!originalComment) throw new Error('No Comment found')

      //await Comment.updateOne({ _id: ObjectId(replyTo)}, { $push: { replies: comment._id } })
      
     

    } 
    
    return res.status(200).json({ message: 'Comment posted successfully.', comment })
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