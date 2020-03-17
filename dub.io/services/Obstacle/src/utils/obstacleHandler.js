const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')
const uniqid = require('uniqid')

const NODE_TYPES = require('../../../../NodeTypes')
const USER_EVENTS = require('../../../../UserEvents')
const OBSTACLE_TYPES = require('./enums/ObstacleTypes')

const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const collisionSchema = require('../../../avro_schemas/Collisions')
const userEventsSchema = require('../../../avro_schemas/UserEvents')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const obstacles = {}
const userWarpCollisions = {}
const userVirusCollisions = {}

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

const publishWarpCollision = async (playerNode) => {
  if (!userWarpCollisions[playerNode.id]) {
    userWarpCollisions[playerNode.id] = 'test'
    userWarpCollisions[playerNode.id] = setTimeout(() => {
      delete userWarpCollisions[playerNode.id]
    }, 1000)

    const resetMessage = userEvents.toBuffer({
      userId: playerNode.id,
      event: USER_EVENTS.POSITION_RESET,
      value: null,
      activeTime: null,
    })

    await producer.send({
      topic: config.userEventsTopic,
      messages: [{
        value: resetMessage,
      }],
      acks: 1,
    })
  }
}

const publishVirusCollision = async (playerNode) => {
  if (!userVirusCollisions[playerNode.id]) {
    userVirusCollisions[playerNode.id] = 'test'
    userVirusCollisions[playerNode.id] = setTimeout(() => {
      delete userVirusCollisions[playerNode.id]
    }, 1000)

    await publishWarpCollision(playerNode)

    const growMessage = userEvents.toBuffer({
      userId: playerNode.id,
      event: USER_EVENTS.GROW,
      value: -(playerNode.radius / 2),
      activeTime: null,
    })

    await producer.send({
      topic: config.userEventsTopic,
      messages: [{
        value: growMessage,
      }],
      acks: 1,
    })
  }
}

const publishUserEvent = async (playerNode, obstacleNode) => {
  try {
    switch (obstacleNode.title) {
      case OBSTACLE_TYPES.VIRUS:
        if (playerNode.radius > obstacleNode.radius) await publishVirusCollision(playerNode)
        break
      case OBSTACLE_TYPES.WARP:
        await publishWarpCollision(playerNode)
        break
      default:
    }
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
      acks: 1,
    })
  } catch (e) {
    console.error(e)
  }
}

const addWarp = (x, y) => {
  const warp = {
    id: uniqid(),
    type: NODE_TYPES.OBSTACLE,
    title: OBSTACLE_TYPES.WARP,
    position: { x, y },
    radius: gameOptions.OBSTACLE_MIN_RADIUS,
    sprite: gameOptions.DEFAULT_WARP_SPRITE,
    color: 'rgba(0,0,0,0)',
  }

  obstacles[warp.id] = warp
}

const addVirusRandomlyBetweenPositions = (x1, y1, x2, y2) => {
  const distX = x2 - x1
  const distY = y2 - y1
  const diffRadius = gameOptions.OBSTACLE_MAX_RADIUS - gameOptions.OBSTACLE_MIN_RADIUS

  const x = x1 + Math.random() * distX
  const y = y1 + Math.random() * distY
  const radius = gameOptions.OBSTACLE_MIN_RADIUS + Math.random() * diffRadius

  const obstacle = {
    id: uniqid(),
    type: NODE_TYPES.OBSTACLE,
    title: OBSTACLE_TYPES.VIRUS,
    position: { x, y },
    radius,
    sprite: gameOptions.DEFAULT_VIRUS_SPRITE,
    color: 'rgba(0,0,0,0)',
  }

  obstacles[obstacle.id] = obstacle

  const diffTime = gameOptions.OBSTACLE_MAX_LIFE_TIME - gameOptions.OBSTACLE_MIN_LIFE_TIME

  setTimeout(() => {
    delete obstacles[obstacle.id]
    addVirusRandomlyBetweenPositions(x1, y1, x2, y2)
    publishObstacles()
  }, gameOptions.OBSTACLE_MIN_LIFE_TIME + Math.random() * diffTime)
}

const generateObstacles = () => {
  addVirusRandomlyBetweenPositions(
    gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addVirusRandomlyBetweenPositions(
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addVirusRandomlyBetweenPositions(
    gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addVirusRandomlyBetweenPositions(
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE / 2 + gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
    gameOptions.GRID_SIZE - gameOptions.OBSTACLE_MAX_RADIUS,
  )

  addWarp(
    gameOptions.OBSTACLE_MIN_RADIUS + 1,
    gameOptions.OBSTACLE_MIN_RADIUS + 1,
  )

  addWarp(
    gameOptions.GRID_SIZE - (gameOptions.OBSTACLE_MIN_RADIUS + 1),
    gameOptions.OBSTACLE_MIN_RADIUS + 1,
  )

  addWarp(
    gameOptions.GRID_SIZE - (gameOptions.OBSTACLE_MIN_RADIUS + 1),
    gameOptions.GRID_SIZE - (gameOptions.OBSTACLE_MIN_RADIUS + 1),
  )

  addWarp(
    gameOptions.OBSTACLE_MIN_RADIUS + 1,
    gameOptions.GRID_SIZE - (gameOptions.OBSTACLE_MIN_RADIUS + 1),
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

const processCollision = (playerNode, obstacleNode) => {
  if (obstacles[obstacleNode.id]) {
    publishUserEvent(playerNode, obstacleNode)
  }
}

const startConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.collisionNodes[0].type === NODE_TYPES.PLAYER
        && message.collisionNodes[1].type === NODE_TYPES.OBSTACLE) {
        processCollision(message.collisionNodes[0], message.collisionNodes[1])
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
