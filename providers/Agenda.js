const Agenda = require("agenda")
const config = require("../config")

const agenda = new Agenda({ db: { address: config.mongoConnection }})

const ListingController = require("../controllers/ListingController")
const BidController = require("../controllers/BidController")
const TokenController = require("../controllers/TokenController")
const Auction = require("../models/Auction")

agenda.define('expire_auction', async (job) => {
  // Got a weird circular dependency when using the expire function on AuctionController
  try {
    const { id } = job.attrs.data
    const auction = await Auction.findOne({ _id: id })
    if (!auction) throw new Error('No auction found')
  
    const now = new Date().getTime() / 1000
    if (auction.expiry <= now) {
      auction.ended = true
      await auction.save()

      TokenController.syncAuctions({
        collectionId: auction.collectionAddress,
        tokenId: auction.tokenId
      })
  
      // TODO: send notification to owner?
    }
  } catch (error) {
    console.error(error)
  }
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