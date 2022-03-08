require("dotenv").config()
const PORT = process.env.PORT || 5000

const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const morgan = require("morgan")
const helmet = require("helmet")

const { Moralis } = require("./utils/Moralis")
const Collection = require("./models/Collection")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(helmet())
app.use(morgan('dev'))

mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`)

app.get("/", (req, res) => {
  return res.send('Hive API')
})

app.get("/owned-by/:address", async (req, res) => {
  const options = {
    address: req.params.address
  }
  const tokens = await Moralis.Web3API.account.getNFTs(options)
  return res.send(tokens)
})

app.use('/healthcheck', require("./routes/healthcheck"))
app.use('/collections', require("./routes/collections"))
app.use('/c', require("./routes/collections"))
app.use('/tokens', require("./routes/tokens"))
app.use('/t', require("./routes/tokens"))
app.use('/auth', require("./routes/auth"))
app.use('/listings', require("./routes/listings"))

app.listen(PORT, () => {
  // Setup listeners for marketplace events
  require("./listeners/marketplace").default()

  // Setup listeners for all whitelisted collections
  Collection.find({ whitelisted: true }).then((docs) => {
    docs.forEach((doc) => {
      require("./listeners/collection")(doc)
    })
  })

  // Setup Queue Workers
  require("./queue/Worker")()

  console.log(`Hive API listening on port ${PORT}`)
})