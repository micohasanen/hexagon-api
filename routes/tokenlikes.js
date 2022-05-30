const router = require("express").Router()
const parseDuration = require("parse-duration")
const mongoose = require("mongoose")
const { sanitizeUrl } = require("../utils/base")

// Models

const Token = require("../models/Token")
const Collection = require("../models/Collection")
const User = require("../models/User")
const TokenLikes = require("../models/TokenLikes")

// Middleware
const { extractUser } = require("../middleware/VerifySignature")



router.post('/', async (req, res) =>
{
    console.log("TokenList Triggered")
    console.log(req.body)
    try
    {

        if (!req.body?.user_address) return res.status(400).json({ message: 'Missing User Address Parameter..' })
        if (!req.body?.collection_id) return res.status(400).json({ message: 'Missing Collection ID parameter.' })
        if (!req.body?.token_id) return res.status(400).json({ message: 'Missing Token ID Parameter.' })

        let user_address = req.body?.user_address
        let collection_id = req.body?.collection_id
        let token_id = req.body?.token_id

        const tokenlikes_alreadyisSaved = new TokenLikes()
        const isAlreadyLiked = await TokenLikes.findOne({ user_address: user_address, collection_id: collection_id, token_id: token_id }).exec()
        console.log(isAlreadyLiked)
        if (!isAlreadyLiked)
        {

            const tokenlikes = new TokenLikes()
            tokenlikes.user_address = user_address
            tokenlikes.collection_id = collection_id
            tokenlikes.token_id = token_id
            tokenlikes.isActive = true
            await tokenlikes.save()

            return res.status(200).json({ message: 'Inserted' })


        } else
        {
            if (isAlreadyLiked.isActive)
            {
                await TokenLikes.updateOne({
                    user_address: user_address,
                    collection_id: collection_id,
                    token_id: token_id,
                    isActive: true
                }, { isActive: false }, { upsert: false })
                return res.status(200).json({ message: 'Updated' })
            } else
            {
                await TokenLikes.updateOne({
                    user_address: user_address,
                    collection_id: collection_id,
                    token_id: token_id,
                    isActive: false
                }, { isActive: true }, { upsert: false })
                return res.status(200).json({ message: 'Updated' })
            }
        }
        //const user = await User.findOne({ address: req.params.address }).exec()
        //if (!user) return res.status(404).json({ message: 'No user found.' })

    } catch (error)
    {
        console.error(error)
        return res.status(500).json({ message: 'Something went wrong.', error })
    }


})



router.get('/getUserLikes/:address', [extractUser], async (req, res) =>
{
    console.log("getUserLikes Triggered")
    console.log(req.body)
    console.log(req.user)
    try
    {

        if (!req.params.address) return res.status(400).json({ message: 'Missing User Address Parameter..' })

        let user_address = req.params.address
        console.log(user_address)
        const tokenlikes_alreadyisSaved = new TokenLikes()
        const userLikes = await TokenLikes.find({ user_address: user_address, isActive: true }).exec()
        console.log(userLikes)
        if (userLikes.length == 0)
        {
            console.log("No likes for this user")
            res.status(200).json({ message: 'No Likes for this user', result: [] })
        } else
        {
            res.status(200).json({ message: 'There are some likes for this user', result: userLikes })
        }

    } catch (error)
    {
        console.error(error)
        return res.status(500).json({ message: 'Something went wrong.', error })
    }

})



router.get('/getCollectionLikes/:collection_id', async (req, res) =>
{
    console.log("getUserLikes Triggered")
    console.log(req.body)
    try
    {

        if (!req.params.collection_id) return res.status(400).json({ message: 'Missing Collection ID Parameter..' })

        let collection_id = req.params.collection_id
        console.log(collection_id)
        const collectionLikes = await TokenLikes.find({ collection_id: collection_id, isActive: true }).exec()
        console.log(collectionLikes)
        if (collectionLikes.length == 0)
        {
            console.log("No likes for this collection")
            res.status(200).json({ message: 'No likes for this collection', result: [] })
        } else
        {
            res.status(200).json({ message: 'There are some likes for this collection', result: collectionLikes })
        }

    } catch (error)
    {
        console.error(error)
        return res.status(500).json({ message: 'Something went wrong.', error })
    }

})


module.exports = router