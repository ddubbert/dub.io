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
const userBoundarieHits = {}
let pubsub = null
let renderEmpty = false

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
    growFactor: 1,
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
    renderEmpty = true
  }
}

const changeDirection = (id, direction) => {
  if (!users[id]) throw new Error('User not found.')
  users[id].direction = direction
  return users[id]
}

const moveUsers = async () => {
  Object.keys(users).forEach((id) => {
    const slowDown = Math.max(1 - (users[id].radius / gameOptions.GRID_SIZE / 2), 0.25)

    users[id].position.x += users[id].direction.x
      * (users[id].speed / (gameOptions.FPS * 1.1)) * slowDown
    users[id].position.y += users[id].direction.y
      * (users[id].speed / (gameOptions.FPS * 1.1)) * slowDown
  })
}

const getUserNodes = () => {
  const nodes = { ...users }
  return Object.keys(nodes).map((id) => ({
    id: nodes[id].id,
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

const startPublishing = () => {
  setInterval(async () => {
    if (Object.keys(users).length > 0 || renderEmpty) {
      renderEmpty = false
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
        acks: 1,
      })
    }
  }, 1000 / (gameOptions.FPS * 1.1))
}

const setInvulnerable = (uId, userEvent) => {
  if (users[uId]) {
    users[uId].invulnerable = true
    users[uId].sprite = gameOptions.DEFAULT_INVULNERABILITY_SPRITE


    clearTimeout(users[uId].invulnerabilityTimeout)
    users[uId].invulnerabilityTimeout = setTimeout(() => {
      if (users[uId]) {
        users[uId].invulnerable = false
        users[uId].sprite = normalSprites[uId]
      }
    }, userEvent.activeTime || gameOptions.DEFAULT_USEREVENT_TIME)
  }
}

const setSpeedUp = (uId, userEvent) => {
  if (users[uId]) {
    const speedUp = userEvent.value || gameOptions.DEFAULT_SPEEDUP_FACTOR
    users[uId].speed *= speedUp

    setTimeout(() => {
      if (users[uId]) {
        users[uId].speed /= speedUp
      }
    }, userEvent.activeTime || gameOptions.DEFAULT_USEREVENT_TIME)
  }
}

const setGrowUp = (uId, userEvent) => {
  if (users[uId]) {
    const growUp = userEvent.value || gameOptions.DEFAULT_GROWUP_FACTOR
    users[uId].growFactor *= growUp

    setTimeout(() => {
      if (users[uId]) {
        users[uId].growFactor /= growUp
      }
    }, userEvent.activeTime || gameOptions.DEFAULT_USEREVENT_TIME)
  }
}

const resetUserPosition = (uId) => {
  if (users[uId]) {
    users[uId].position.x = gameOptions.GRID_SIZE / 2
    users[uId].position.y = gameOptions.GRID_SIZE / 2
  }
}

const processCollision = (node1, node2) => {
  if (node2.type === NODE_TYPES.BOUNDARIES) {
    if (!userBoundarieHits[node1.id]) {
      userBoundarieHits[node1.id] = setTimeout(() => {
        delete userBoundarieHits[node1.id]
      }, 1000)

      const newRadius = users[node1.id].radius * gameOptions.BOUNDARIES_RESET_FACTOR

      if (newRadius < gameOptions.PLAYER_RADIUS) deleteUser(node1.id)
      else users[node1.id].radius = newRadius

      resetUserPosition(node1.id)
    }
  } else if (users[node2.id]
    && users[node1.id].radius > users[node2.id].radius
    && !users[node2.id].invulnerable) {
    const growAmount = node2.radius * (gameOptions.GROW_FACTOR / (gameOptions.FPS * 1.1))
    users[node1.id].radius += growAmount
    users[node2.id].radius -= growAmount * 2

    if (users[node2.id].radius < gameOptions.PLAYER_RADIUS) {
      deleteUser(node2.id)
    }
  }
}

const startCollisionsConsumer = async () => {
  await collisionConsumer.connect()

  await collisionConsumer.subscribe({ topic: config.collisionTopic, fromBeginning: false })

  await collisionConsumer.run({
    eachMessage: async (event) => {
      const message = collision.fromBuffer(event.message.value)
      if (message.collisionNodes[0].type === NODE_TYPES.PLAYER
        && users[message.collisionNodes[0].id]
        && (message.collisionNodes[1].type === NODE_TYPES.PLAYER
          || message.collisionNodes[1].type === NODE_TYPES.BOUNDARIES)) {
        processCollision(message.collisionNodes[0], message.collisionNodes[1])
      }
    },
  })
}

const processUserEvent = (userEvent) => {
  const uId = userEvent.userId

  switch (userEvent.event) {
    case USER_EVENTS.GROW:
      if (userEvent.value) {
        const { value } = userEvent
        const slowDown = Math.max(1 - (users[uId].radius / gameOptions.GRID_SIZE / 2), 0.25)

        users[uId].radius += (value > 0) ? value * users[uId].growFactor * slowDown : value
      }
      if (users[uId].radius < gameOptions.PLAYER_RADIUS) deleteUser(uId)
      break
    case USER_EVENTS.DESTROY:
      deleteUser(uId)
      break
    case USER_EVENTS.INVULNERABLE:
      setInvulnerable(uId, userEvent)
      break
    case USER_EVENTS.SPEED_UP:
      setSpeedUp(uId, userEvent)
      break
    case USER_EVENTS.GROW_UP:
      setGrowUp(uId, userEvent)
      break
    case USER_EVENTS.POSITION_RESET:
      resetUserPosition(uId)
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
      if (users[message.userId]) {
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
