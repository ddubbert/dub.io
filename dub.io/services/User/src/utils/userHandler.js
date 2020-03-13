const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')
const uniqid = require('uniqid')

const DIRECTIONS = require('../utils/enums/Directions')
const CHANNELS = require('../utils/enums/ChannelNames')
const NODE_TYPES = require('../../../../NodeTypes')
const USER_EVENTS = require('../../../../UserEvents')

const gameOptions = require('../../../../gameOptions')
const config = require('../../../../config')
const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const collisionSchema = require('../../../avro_schemas/Collisions')
const userEventsSchema = require('../../../avro_schemas/UserEvents')

const nodePositions = avro.Type.forSchema(nodePositionsSchema)
const collision = avro.Type.forSchema(collisionSchema)
const userEvents = avro.Type.forSchema(userEventsSchema)

const kafka = new Kafka({
  clientId: 'User-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const producer = kafka.producer()
const collisionConsumer = kafka.consumer({ groupId: 'User-Collisions' })
const userEventsConsumer = kafka.consumer({ groupId: 'User-Events' })

const users = {}
const normalSprites = {}
let pubsub = null

const createUser = async (data) => {
  const {
    title,
    position,
    sprite,
    color,
  } = data

  const id = uniqid()

  if (!sprite && !color) throw new Error('Sprite or Color needs to be provided.')

  normalSprites[id] = sprite || null

  users[id] = {
    id,
    type: NODE_TYPES.PLAYER,
    createdAt: new Date().getTime(),
    title,
    position,
    radius: gameOptions.PLAYER_RADIUS,
    sprite: sprite || null,
    color: color || null,
    speed: gameOptions.PLAYER_SPEED,
    direction: DIRECTIONS.RIGHT,
    invulnerable: false,
    invulnerabilityTimeout: null,
  }

  return users[id]
}

const getUserById = async (id) => {
  if (!users[id]) throw new Error('User not found.')
  return users[id]
}

const deleteUser = (id) => {
  if (users[id]) {
    const deletedUser = users[id]
    delete users[id]
    delete normalSprites[id]
    pubsub.publish(CHANNELS.USER_LOST_CHANNEL, { userLost: deletedUser })
  }
}

const changeDirection = (id, direction) => {
  if (!users[id]) throw new Error('User not found.')
  users[id].direction = direction
  return users[id]
}

const moveUsers = async () => {
  Object.keys(users).forEach((id) => {
    const slowDown = 1 - (users[id].radius / gameOptions.GRID_SIZE / 2)
    users[id].position.x += users[id].direction.x * (users[id].speed / gameOptions.FPS) * slowDown
    users[id].position.y += users[id].direction.y * (users[id].speed / gameOptions.FPS) * slowDown
  })
}

const getUserNodes = () => {
  const nodes = { ...users }
  return Object.keys(nodes).map((id) => ({
    id: nodes[id].id,
    createdAt: nodes[id].createdAt,
    type: nodes[id].type,
    title: nodes[id].title,
    position: nodes[id].position,
    radius: nodes[id].radius,
    sprite: nodes[id].sprite,
    color: nodes[id].color,
  }))
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

const startPublishing = () => {
  setInterval(async () => {
    if (Object.keys(users).length > 0) {
      moveUsers()

      const nodes = getUserNodes()

      const message = nodePositions.toBuffer({
        type: NODE_TYPES.PLAYER,
        nodes,
      })

      await producer.send({
        topic: config.nodeTopic,
        messages: [{
          value: message,
        }],
        acks: 0,
      })
    }
  }, 1000 / gameOptions.FPS)
}

const processCollision = (node1, node2) => {
  if (node2.type === NODE_TYPES.BOUNDARIES) {
    const newRadius = users[node1.id].radius * gameOptions.PLAYER_RESET_FACTOR

    if (newRadius < gameOptions.PLAYER_RADIUS) deleteUser(node1.id)
    else users[node1.id].radius = newRadius
  } else if (users[node2.id]
    && users[node1.id].radius > users[node2.id].radius
    && !users[node2.id].invulnerable) {
    if (users[node2.id].radius < gameOptions.PLAYER_RADIUS) {
      users[node1.id].radius += users[node2.id].radius
      deleteUser(node2.id)
    } else {
      const growAmount = node2.radius * (gameOptions.GROW_FACTOR / gameOptions.FPS)
      users[node1.id].radius += growAmount
      users[node2.id].radius -= growAmount
    }
  }
}

const startCollisionsConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.nodes[0].type === NODE_TYPES.PLAYER
        && users[message.nodes[0].id]
        && (message.nodes[1].type === NODE_TYPES.PLAYER
          || message.nodes[1].type === NODE_TYPES.BOUNDARIES)) {
        processCollision(message.nodes[0], message.nodes[1])
      }
    },
  })
}

const processUserEvent = (userEvent) => {
  const uId = userEvent.user.id

  switch (userEvent.event) {
    case USER_EVENTS.GROW:
      if (userEvent.value) users[uId].radius += userEvent.value
      break
    case USER_EVENTS.DESTROY:
      deleteUser(uId)
      break
    case USER_EVENTS.INVULNERABLE:
      users[uId].invulnerable = true
      users[uId].sprite = gameOptions.DEFAULT_INVULNERABILITY_SPRITE


      clearTimeout(users[uId].invulnerabilityTimeout)
      users[uId].invulnerabilityTimeout = setTimeout(() => {
        if (users[uId]) {
          users[uId].invulnerable = false
          users[uId].sprite = normalSprites[uId]
        }
      }, userEvent.value || gameOptions.DEFAULT_INVULNERABILITY_TIME)
      break
    default:
  }
}

const startUserEventsConsumer = async () => {
  await userEventsConsumer.connect()

  await userEventsConsumer.subscribe({ topic: config.userEventsTopic, fromBeginning: false })

  await userEventsConsumer.run({
    eachMessage: async (event) => {
      const message = userEvents.fromBuffer(event.message.value)
      if (users[message.user.id]) {
        processUserEvent(message)
      }
    },
  })
}

const startProducer = async () => {
  await producer.connect()
}

const run = async (publishSubscribe) => {
  pubsub = publishSubscribe
  await createTopics()
  await startCollisionsConsumer()
  await startUserEventsConsumer()
  await startProducer()

  startPublishing()
}

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.forEach((type) => {
  process.on(type, async (e) => {
    try {
      console.log(`process.on ${type}`)
      console.error(e)
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
      await producer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})

module.exports = {
  run,
  createUser,
  getUserById,
  deleteUser,
  changeDirection,
}
