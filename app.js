require("dotenv").config()
const PORT = process.env.PORT || 5000
const config = require("./config")

const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const morgan = require("morgan")
const helmet = require("helmet")
const xss = require("xss-clean")
const rateLimiter = require("./middleware/RateLimiter")
const fileupload = require("express-fileupload")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(helmet())
app.use(morgan('dev'))
app.use(xss())
app.use(rateLimiter)
app.use(fileupload({
  limits: { fileSize: 15000000 } // 15MB Upload Limit
}))


mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`)

app.get("/", (req, res) => {
  return res.send('Hive API')
})

app.use('/healthcheck', require("./routes/healthcheck"))
app.use('/collections', require("./routes/collections"))
app.use('/c', require("./routes/collections"))
app.use('/tokens', require("./routes/tokens"))
app.use('/t', require("./routes/tokens"))
app.use('/auth', require("./routes/auth"))
app.use('/listings', require("./routes/listings"))
app.use('/bids', require("./routes/bids"))
app.use('/users', require("./routes/users"))
app.use('/auctions', require("./routes/auctions"))
app.use('/notifications', require("./routes/notifications"))
app.use('/uploads', require("./routes/uploads"))

// If all else fails
app.use(function(req, res, next) {
  next(404);
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.sendStatus(err || 500);
});

app.listen(PORT, () => {
  // Setup Queue Workers
  require("./queue/Worker")()

  console.log(`Hive API listening on port ${PORT}`)
})