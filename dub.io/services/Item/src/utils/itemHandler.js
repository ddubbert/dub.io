const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')
const uniqid = require('uniqid')

const NODE_TYPES = require('../../../../NodeTypes')
const USER_EVENTS = require('../../../../UserEvents')
const ITEM_TYPES = require('../utils/enums/ItemTypes')

const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const collisionSchema = require('../../../avro_schemas/Collisions')
const userEventsSchema = require('../../../avro_schemas/UserEvents')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const items = {}

const nodePositions = avro.Type.forSchema(nodePositionsSchema)
const collision = avro.Type.forSchema(collisionSchema)
const userEvents = avro.Type.forSchema(userEventsSchema)

const kafka = new Kafka({
  clientId: 'Item-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const producer = kafka.producer()
const collisionConsumer = kafka.consumer({ groupId: 'Item-Collisions' })

const addRandomItemAtRandomPosition = () => {
  const max = gameOptions.GRID_SIZE - 1 - gameOptions.ITEM_RADIUS * 5
  const min = gameOptions.ITEM_RADIUS * 5

  const position = {
    x: Math.max(Math.random() * max, min),
    y: Math.max(Math.random() * max, min),
  }

  const typeAmount = Object.keys(ITEM_TYPES).length
  const randomIndex = Math.ceil(Math.random() * (typeAmount)) - 1
  const itemType = ITEM_TYPES[Object.keys(ITEM_TYPES)[randomIndex]]

  const item = {
    id: uniqid(),
    type: NODE_TYPES.ITEM,
    createdAt: new Date().getTime(),
    title: itemType,
    position,
    radius: gameOptions.ITEM_RADIUS,
    sprite: itemType,
    color: 'rgb(0,0,0)',
  }

  items[item.id] = item
}

const generateItems = () => {
  const array = [...Array(gameOptions.ITEM_NODE_AMOUNT).keys()]
  array.forEach(() => {
    addRandomItemAtRandomPosition()
  })
}

const getNodes = () => {
  const nodes = Object.keys(items).map((id) => items[id])

  return {
    type: NODE_TYPES.ITEM,
    nodes,
  }
}

const publishUserEvent = async (playerNode, itemNode) => {
  try {
    let event = null
    let value = null
    let activeTime = null

    switch (itemNode.title) {
      case ITEM_TYPES.SPEEDUP:
        event = USER_EVENTS.SPEED_UP
        value = gameOptions.DEFAULT_SPEEDUP_FACTOR
        activeTime = gameOptions.DEFAULT_ITEM_ACTIVE_TIME
        break
      case ITEM_TYPES.INVULNERABLE:
        event = USER_EVENTS.INVULNERABLE
        activeTime = gameOptions.DEFAULT_ITEM_ACTIVE_TIME * 0.5
        break
      case ITEM_TYPES.GROWUP:
        event = USER_EVENTS.GROW_UP
        value = gameOptions.DEFAULT_GROWUP_FACTOR
        activeTime = gameOptions.DEFAULT_ITEM_ACTIVE_TIME
        break
      default:
    }

    if (event) {
      const message = userEvents.toBuffer({
        user: playerNode,
        event,
        value,
        activeTime,
      })

      await producer.send({
        topic: config.userEventsTopic,
        messages: [{
          value: message,
        }],
        acks: 0,
      })
    }
  } catch (e) {
    console.error(e)
  }
}

const publishItems = async () => {
  try {
    const message = nodePositions.toBuffer(getNodes())
    await producer.send({
      topic: config.nodeTopic,
      messages: [{
        value: message,
      }],
      acks: 0,
    })
  } catch (e) {
    console.error(e)
  }
}

const startPublishing = async () => {
  generateItems()

  publishItems()
}

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.nodeTopic,
    numPartitions: 1,
    replicationFactor: 1,
  }, {
    topic: config.collisionTopic,
    numPartitions: 3,
    replicationFactor: 1,
  }, {
    topic: config.userEventsTopic,
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

const processCollision = (playerNode, itemNode) => {
  if (items[itemNode.id]) {
    delete items[itemNode.id]
    publishUserEvent(playerNode, itemNode)
    addRandomItemAtRandomPosition()
    publishItems()
  }
}

const startConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.nodes[0].type === NODE_TYPES.PLAYER
        && message.nodes[1].type === NODE_TYPES.ITEM) {
        processCollision(message.nodes[0], message.nodes[1])
      }
    },
  })
}

const startProducer = async () => {
  await producer.connect()
}

const run = async () => {
  await createTopics()
  await startConsumer()
  await startProducer()

  await startPublishing()
}

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.forEach((type) => {
  process.on(type, async (e) => {
    try {
      console.log(`process.on ${type}`)
      console.error(e)
      // await nodeConsumer.disconnect()
      await producer.disconnect()
      process.exit(0)
    } catch (_) {
      process.exit(1)
    }
  })
})

signalTraps.forEach((type) => {
  process.once(type, async () => {
    try {
      // await nodeConsumer.disconnect()
      await producer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})

module.exports = {
  run,
}
