const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')
const uniqid = require('uniqid')

const NODE_TYPES = require('../../../../NodeTypes')
const USER_EVENTS = require('../../../../UserEvents')

const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const collisionSchema = require('../../../avro_schemas/Collisions')
const userEventsSchema = require('../../../avro_schemas/UserEvents')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const food = {}

const nodePositions = avro.Type.forSchema(nodePositionsSchema)
const collision = avro.Type.forSchema(collisionSchema)
const userEvents = avro.Type.forSchema(userEventsSchema)

const kafka = new Kafka({
  clientId: 'Food-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const producer = kafka.producer()
const collisionConsumer = kafka.consumer({ groupId: 'Food-Collisions' })

const addFoodAtRandomPosition = () => {
  const max = gameOptions.GRID_SIZE - 1 - gameOptions.FOOD_RADIUS * 10
  const min = gameOptions.FOOD_RADIUS * 10

  const position = {
    x: Math.max(Math.random() * max, min),
    y: Math.max(Math.random() * max, min),
  }

  const f = {
    id: uniqid(),
    type: NODE_TYPES.FOOD,
    createdAt: new Date().getTime(),
    title: NODE_TYPES.FOOD,
    position,
    radius: gameOptions.FOOD_RADIUS,
    sprite: gameOptions.DEFAULT_FOOD_SPRITE,
    color: 'rgb(0,0,0)',
  }

  food[f.id] = f
}

const generateFood = () => {
  const array = [...Array(gameOptions.FOOD_NODE_AMOUNT).keys()]
  array.forEach(() => {
    addFoodAtRandomPosition()
  })
}

const getNodes = () => {
  const nodes = Object.keys(food).map((id) => food[id])

  return {
    type: NODE_TYPES.FOOD,
    nodes,
  }
}

const publishUserEvent = async (playerNode, foodNode) => {
  try {
    const message = userEvents.toBuffer({
      user: playerNode,
      event: USER_EVENTS.GROW,
      value: gameOptions.GROW_FACTOR * foodNode.radius,
    })

    await producer.send({
      topic: config.userEventsTopic,
      messages: [{
        value: message,
      }],
      acks: 0,
    })
  } catch (e) {
    console.error(e)
  }
}

const publishFood = async () => {
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
  generateFood()

  publishFood()
}

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.nodeTopic,
    numPartitions: 1,
    replicationFactor: 1,
  }, {
    topic: config.collisionTopic,
    numPartitions: 1,
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

const processCollision = (playerNode, foodNode) => {
  if (food[foodNode.id]) {
    delete food[foodNode.id]
    publishUserEvent(playerNode, foodNode)
    addFoodAtRandomPosition()
    publishFood()
  }
}

const startConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.nodes[0].type === NODE_TYPES.PLAYER
        && message.nodes[1].type === NODE_TYPES.FOOD) {
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
