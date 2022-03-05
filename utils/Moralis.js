const Moralis = require("moralis/node")
Moralis.start({ serverUrl: process.env.MORALIS_SERVER, appId: process.send.MORALIS_APP_ID })

module.exports = { Moralis }