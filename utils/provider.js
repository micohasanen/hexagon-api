const ethers = require("ethers")
const Provider = new ethers.providers.JsonRpcProvider('https://speedy-nodes-nyc.moralis.io/886f17949de1effe3749e465/eth/mainnet')

module.exports = { Provider, ethers }