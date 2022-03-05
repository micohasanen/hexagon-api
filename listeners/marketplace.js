const abi = require("../abis/HiveMarketplaceV2.json")
const { Provider, currentChain } = require("../utils/Web3Provider")
const CollectionController = require("../controllers/CollectionController")
const contract = new Provider.eth.Contract(abi, process.env.MARKETPLACE_ADDRESS)

exports.syncWhitelisted = async () => {
  const whitelistHistory = await contract.getPastEvents('CollectionWhitelisted', { fromBlock: 0, toBlock: 'latest' })
  const blacklistHistory = await contract.getPastEvents('CollectionRemoved', { fromBlock: 0, toBlock: 'latest' })
  const updateHistory = await contract.getPastEvents('CollectionUpdated', { fromBlock: 0, toBlock: 'latest' })
  
  let whitelisted = []
  // Get all whitelisted
  for (const wl of whitelistHistory) {
    whitelisted.push({ ...wl.returnValues, blockNumber: wl.blockNumber })
  }
  // Check if collection is removed after whitelisting
  for (const bl of blacklistHistory) {
    const i = whitelisted.findIndex(w => w.nftAddress === bl.returnValues.nftAddress)
    if (i !== -1 && bl.blockNumber > whitelisted[i].blockNumber) {
      whitelisted.splice(i, 1)
    }
  }
  // Make updates to the collection
  for (const update of updateHistory) {
    const wl = whitelisted.find(w => w.nftAddress === update.returnValues.nftAddress)
    if (wl && update.blockNumber > wl.blockNumber) wl = { ...update.returnValues, blockNumber: update.blockNumber }
  }

  whitelisted.forEach((wl) => {
    CollectionController.add({ 
      address: wl.nftAddress, 
      chain: currentChain, 
      name: 'WhitelistedCollection',
      royaltyRecipient: wl.royaltyRecipient,
      royaltyFee: wl.royaltyFee
    })
  })
}

exports.default = async () => {
  // this.syncWhitelisted()

  contract.events.CollectionWhitelisted()
  .on('data', (data) => {
    console.log(data)
  })
}