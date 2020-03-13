const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')

const CHANNELS = require('./enums/ChannelNames')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')
const gridPositionsSchema = require('../../../avro_schemas/GridPositions')

// TODO Kafka andere events abgreifen

let grid = null
let changed = false

const gridPositions = avro.Type.forSchema(gridPositionsSchema)
const kafka = new Kafka({
  clientId: 'Render-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const gridConsumer = kafka.consumer({ groupId: 'render-group' })

const getGrid = () => grid

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.gridTopic,
    numPartitions: 1,
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
    if (grid && changed) {
      pubsub.publish(CHANNELS.RENDER_UPDATE_CHANNEL, { renderUpdate: grid })
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
      grid = message
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
  getGrid,
}
