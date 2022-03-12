// Holding the function signatures for unique functions for each contract
const CHECKER_ERC721 = "0x70a08231"
const CHECKER_ERC1155 = "0x4e1273f4"

function hasMethod (code, signature) {
  return code.indexOf(signature.slice(2, signature.length)) > 0
}

exports.hasMethod = (code, signature) => {
  return hasMethod(code, signature)
}

exports.getContractType = (bytecode) => {
  if (hasMethod(bytecode, CHECKER_ERC721)) return 'ERC721'
  else if (hasMethod(bytecode, CHECKER_ERC1155)) return 'ERC1155'
  else return null
}

exports.isZeroAddress = (address) => {
  return address === '0x0000000000000000000000000000000000000000'
}