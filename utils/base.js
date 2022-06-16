const sanitize = require("@braintree/sanitize-url").sanitizeUrl
const web3 = require("web3")

const config = require("../config")

exports.isExpired = (timestamp) => {
  const expiry = new Date(timestamp).getTime()
  const now = new Date().getTime()

  if (expiry < now / 1000) return true
  return false
}

exports.sanitizeUrl = (url) => {
  if (!url) return ''
  return sanitize(url)
}

exports.toTwosComplement = (id) => {
  const str = web3.utils.toTwosComplement(id)

  return str.replace('0x', '')
}

exports.chainNameToId = (name) => {
  const chain = config.chains.find((ch) => ch.label === name)
  return chain?.id ? chain.id : null
}

exports.constructTokenURI = ({ baseURI, baseExtension }, tokenId) => {
  let str = `${baseURI}/${tokenId}`
  if (baseExtension) str += baseExtension

  return str
}