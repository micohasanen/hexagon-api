const router = require("express").Router()
const PinataUpload = require("../utils/PinataUpload")

router.post('/ipfs', async (req, res) => {
  try {
    if (!req.files) return res.status(400).json({ message: 'Files missing.' })

    const files = Object.values(req.files)
    const uploaded = []
    
    for (const file of files) {
      const { IpfsHash } = await PinataUpload(file)
      uploaded.push({ fileName: file.name, ipfsUrl: `ipfs://${IpfsHash}`, hash: IpfsHash })
    }

    return res.status(200).json({ message: 'Upload successful.', results: uploaded })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router