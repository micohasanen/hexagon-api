const router = require("express").Router()
const { Moralis } = require("../utils/Moralis")

router.post('/ipfs', async (req, res) => {
  try {
    if (!req.files) return res.status(400).json({ message: 'Files missing.' })

    const files = Object.values(req.files)
    const uploaded = []
    
    for (const file of files) {
      const data = Array.from(file.data)
      const moralisFile = new Moralis.File(file.name, data, file.mimetype)
      await moralisFile.saveIPFS({ useMasterKey: true })

      uploaded.push({ fileName: file.name, ipfsUrl: `ipfs://${moralisFile.hash()}`, hash: moralisFile.hash() })
    }

    return res.status(200).json({ message: 'Upload successful.', results: uploaded })
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong.', error })
  }
})

module.exports = router