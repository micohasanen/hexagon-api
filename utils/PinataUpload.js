const Pinata = require("@pinata/sdk")
const { Readable } = require("stream")
const { nanoid } = require("nanoid")
const pinata = Pinata("4b81e80061cc329a4f1a", "055136f38d4dcf4a5d9be79e7b1ce8b2fffe1c9fe1e7f323043f3e1f19a932e2")

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