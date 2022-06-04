const Moralis = require("moralis/node")

Moralis.start({ 
  serverUrl: process.env.MORALIS_SERVER, 
  appId: process.env.MORALIS_APP_ID, 
  masterKey: process.env.MORALIS_MASTER_KEY  
})

module.exports = { Moralis }