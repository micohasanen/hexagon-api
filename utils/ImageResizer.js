const Jimp = require("jimp")

function resolveIpfs (path) {
  if (path.startsWith('ipfs://')) 
    return path.replace('ipfs://', process.env.IPFS_GATEWAY)
  return path
}

module.exports = async (imagePath, settings = { height: null, width: 1024, quality: 85 }) => {
  try {
    if (!imagePath) throw new Error('Image Path must be specified.')

    const path = resolveIpfs(imagePath)

    const image = await Jimp.read(path)
    image
    .resize(settings.height || Jimp.AUTO, settings.width || Jimp.AUTO)
    .quality(settings.quality || 85)

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG)

    return Promise.resolve(buffer)
  } catch (error) {
    return Promise.reject(error)
  }
}