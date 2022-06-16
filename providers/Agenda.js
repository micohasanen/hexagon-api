const Agenda = require("agenda")
const config = require("../config")

const agenda = new Agenda({ db: { address: config.mongoConnection }})

const ListingController = require("../controllers/ListingController")
const BidController = require("../controllers/BidController")
const AuctionController = require("../controllers/AuctionController")

agenda.define('expire_auction', (job) => {
  const { id } = job.attrs.data
  AuctionController.expire(id)
})

agenda.define('expire_listing', (job) => {
  const { id } = job.attrs.data
  ListingController.expire(id)
})

agenda.define('expire_bid', (job) => {
  const { id } = job.attrs.data
  BidController.expire(id)
})

exports.initAgenda = async () => {
  await agenda.start()
  console.log('Agenda Inited')
}

exports.scheduleJob = async (when, name, data) => {
  await agenda.schedule(when, name, { ...data })
}

exports.agenda = agenda