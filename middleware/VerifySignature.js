const { ethers } = require("ethers")
const jwt = require("jsonwebtoken")

function getDomain (chainId) {
  return {
    name : "HEXAGONMarketplace",
    version : "1",
    chainId,
    verifyingContract : process.env.MARKETPLACE_ADDRESS
  }
}

const typesListing = {

  "AcceptListing": [{
      "name": "contractAddress",
      "type": "address"
      },
      {
          "name": "tokenId",
          "type": "uint256"
      },
      {
          "name": "userAddress",
          "type": "address"
      },
      {
          "name": "pricePerItem",
          "type": "uint256"
      },
      {
          "name": "quantity",
          "type": "uint256"
      },
      {
          "name": "expiry",
          "type": "uint256"
      },
      {
          "name": "nonce",
          "type": "uint256"
      }
  ]
  
}
const typesBid = {

  "AcceptBid": [{
      "name": "contractAddress",
      "type": "address"
      },
      {
          "name": "tokenId",
          "type": "uint256"
      },
      {
          "name": "userAddress",
          "type": "address"
      },
      {
          "name": "pricePerItem",
          "type": "uint256"
      },
      {
          "name": "quantity",
          "type": "uint256"
      },
      {
          "name": "expiry",
          "type": "uint256"
      },
      {
          "name": "nonce",
          "type": "uint256"
      }
  ]
  
}

exports.verifyListing = async (req, res, next) => {
  try {
    if (!req.headers.authorization) return res.status(401).json({ message: 'Signature token missing.' })

    const token = req.headers.authorization.replace('Bearer ', '')

    const listing = { ...req.body }
    delete listing.r
    delete listing.v
    delete listing.s

    const tokenData = jwt.verify(token, listing.contractAddress)
    const signature = tokenData.data

    const verifiedAddress = ethers.utils.verifyTypedData(getDomain(tokenData.chain), typesListing, listing, signature)
    
    if (verifiedAddress.toLowerCase() !== listing.userAddress.toLowerCase())
      return res.status(401).json({ message: 'Signature mismatch.' })

    next()
  } catch (error) {
    console.log(error)
    return res.status(401).json({ message: 'Signature mismatch.' })
  }
}

exports.verifyBid = async (req, res, next) => {
  try {
    if (!req.headers.authorization) return res.status(401).json({ message: 'Signature token missing.' })

    const token = req.headers.authorization.replace('Bearer ', '')

    const bid = { ...req.body }
    delete bid.r
    delete bid.v
    delete bid.s

    const tokenData = jwt.verify(token, bid.contractAddress)
    const signature = tokenData.data

    const verifiedAddress = ethers.utils.verifyTypedData(getDomain(tokenData.chain), typesBid, bid, signature)
    
    if (verifiedAddress.toLowerCase() !== bid.userAddress.toLowerCase())
      return res.status(401).json({ message: 'Signature mismatch.' })

    next()
  } catch (error) {
    console.log(error)
    return res.status(401).json({ message: 'Signature mismatch.' })
  }
}