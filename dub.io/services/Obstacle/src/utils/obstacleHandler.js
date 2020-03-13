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

const obstacles = {}

const nodePositions = avro.Type.forSchema(nodePositionsSchema)
const collision = avro.Type.forSchema(collisionSchema)
const userEvents = avro.Type.forSchema(userEventsSchema)

const kafka = new Kafka({
  clientId: 'Obstacle-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const producer = kafka.producer()
const collisionConsumer = kafka.consumer({ groupId: 'Obstacle-Collisions' })

const getNodes = () => {
  const nodes = Object.keys(obstacles).map((id) => obstacles[id])

  return {
    type: NODE_TYPES.OBSTACLE,
    nodes,
  }
}

const publishUserEvent = async (playerNode) => {
  try {
    const message = userEvents.toBuffer({
      user: playerNode,
      event: USER_EVENTS.INVULNERABLE,
      value: gameOptions.DEFAULT_INVULNERABILITY_TIME,
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

const publishObstacles = async () => {
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

const addObstacleRandomlyBetweenPositions = (x1, y1, x2, y2) => {
  const distX = x2 - x1
  const distY = y2 - y1
  const diffRadius = gameOptions.OBSTACLE_MAX_RADIUS - gameOptions.OBSTACLE_MIN_RADIUS

  const x = x1 + Math.random() * distX
  const y = y1 + Math.random() * distY
  const radius = gameOptions.OBSTACLE_MIN_RADIUS + Math.random() * diffRadius

  const obstacle = {
    id: uniqid(),
    type: NODE_TYPES.OBSTACLE,
    createdAt: new Date().getTime(),
    title: NODE_TYPES.OBSTACLE,
    position: { x, y },
    radius,
    sprite: gameOptions.DEFAULT_OBSTACLE_SPRITE,
    color: 'rgba(0,255,0,0.5)',
  }

  obstacles[obstacle.id] = obstacle

  const diffTime = gameOptions.OBSTACLE_MAX_LIFE_TIME - gameOptions.OBSTACLE_MIN_LIFE_TIME

  setTimeout(() => {
    delete obstacles[obstacle.id]
    addObstacleRandomlyBetweenPositions(x1, y1, x2, y2)
    publishObstacles()
  }, gameOptions.OBSTACLE_MIN_LIFE_TIME + Math.random() * diffTime)
}

const generateObstacles = () => {
  addObstacleRandomlyBetweenPositions(
    0 + gameOptions.OBSTACLE_MAX_RADIUS,
    0 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addObstacleRandomlyBetweenPositions(
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    0 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addObstacleRandomlyBetweenPositions(
    0 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addObstacleRandomlyBetweenPositions(
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
  )
}

const startPublishing = async () => {
  generateObstacles()

  publishObstacles()
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

const processCollision = (playerNode, obstacleNode) => {
  if (obstacles[obstacleNode.id] && playerNode.radius < obstacleNode.radius) {
    publishUserEvent(playerNode)
  }
}

const startConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.nodes[0].type === NODE_TYPES.PLAYER
        && message.nodes[1].type === NODE_TYPES.OBSTACLE) {
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
