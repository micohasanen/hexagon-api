const Pinata = require("@pinata/sdk")
const { Readable } = require("stream")
const { nanoid } = require("nanoid")
const pinata = Pinata(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET)

module.exports = async (file) => {
  try {
    const stream = Readable.from(file.data)
    stream.path = `${nanoid()}.jpg` // Hack, Pinata won't upload without a filename

    const pinataFile = await pinata.pinFileToIPFS(stream)

    return pinataFile
  } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}