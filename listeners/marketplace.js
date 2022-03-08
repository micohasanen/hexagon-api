const abi = require("../abis/HiveMarketplaceV2.json")
const CollectionController = require("../controllers/CollectionController")
const GetProvider = require("../utils/ChainProvider")

const balanceOf = {
  "inputs": [
    {
      "internalType": "address[]",
      "name": "accounts",
      "type": "address[]"
    },
    {
      "internalType": "uint256[]",
      "name": "ids",
      "type": "uint256[]"
    }
  ],
  "name": "balanceOfBatch",
  "outputs": [
    {
      "internalType": "uint256[]",
      "name": "",
      "type": "uint256[]"
    }
  ],
  "stateMutability": "view",
  "type": "function"
}

exports.default = async () => {
  const { Provider } = GetProvider('eth')
  const signature = Provider.eth.abi.encodeFunctionSignature(balanceOf)
  console.log({signature})
}