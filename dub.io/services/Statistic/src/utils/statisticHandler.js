const avro = require('avsc')
const { Kafka } = require('kafkajs')

const CHANNELS = require('./enums/ChannelNames')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')
const gridPositionsSchema = require('../../../avro_schemas/GridPositions')

let players = []
let changed = false

const gridPositions = avro.Type.forSchema(gridPositionsSchema)
const kafka = new Kafka({
  clientId: 'Statistic-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const gridConsumer = kafka.consumer({ groupId: 'statistic-group' })

const createLeaderBoard = () => {
  const leaderBoard = { entries: [] }

  if (players.length > 0) {
    players.forEach((p) => {
      leaderBoard.entries.push({
        title: p.title,
        points: Math.round((p.radius - gameOptions.PLAYER_RADIUS) * 1000),
        sprite: p.sprite,
        color: p.color,
      })
    })

    leaderBoard.entries.sort((a, b) => b.points - a.points)
  }

  return leaderBoard
}

const getLeaderBoard = () => createLeaderBoard()

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.gridTopic,
    numPartitions: 3,
    replicationFactor: 1,
  }]

  await admin.connect()

  try {
    await admin.createTopics({
      topics: topicsToCreate,
    })
  } catch (e) {
    console.error(e)
  }

  await admin.disconnect()
}

const startPublishing = (pubsub) => {
  setInterval(async () => {
    if (players && changed) {
      pubsub.publish(CHANNELS.BOARD_UPDATE_CHANNEL, { leaderBoardUpdates: getLeaderBoard() })
      changed = false
    }
  }, 1000 / gameOptions.FPS)
}

const startConsumer = async () => {
  await gridConsumer.connect()

  await gridConsumer.subscribe({ topic: config.gridTopic, fromBeginning: false })

  await gridConsumer.run({
    eachMessage: async (event) => {
      const message = gridPositions.fromBuffer(event.message.value)
      players = message.playerNodes
      changed = true
    },
  })
}

const run = async (pubsub) => {
  await createTopics()
  await startConsumer()

  startPublishing(pubsub)
}

module.exports = {
  run,
  getLeaderBoard,
}
