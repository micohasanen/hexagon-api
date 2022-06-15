const Agenda = require("agenda")
const config = require("../config")

const agenda = new Agenda({ db: { address: config.mongoConnection }})

exports.initAgenda = async () => {
  await agenda.start()
  console.log('Agenda Inited')
}

exports.agenda = agenda