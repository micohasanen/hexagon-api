const Pinata = require("@pinata/sdk")
const pinata = Pinata(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET)

pinata.testAuthentication().then((res) => {
  console.log(res)
}).catch((err) => {
  console.error(err)
})

module.exports = pinata