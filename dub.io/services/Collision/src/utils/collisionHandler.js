const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')

const NODE_TYPES = require('../../../../NodeTypes')

const gridPositionsSchema = require('../../../avro_schemas/GridPositions')
const collisionSchema = require('../../../avro_schemas/Collisions')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const gridPositions = avro.Type.forSchema(gridPositionsSchema)
const collision = avro.Type.forSchema(collisionSchema)

const kafka = new Kafka({
  clientId: 'Collision-Service',
  brokers: [`${config.host}:${config.kafkaPort}`],
})
const admin = kafka.admin()
const gridConsumer = kafka.consumer({ groupId: 'collision-group' })
const collisionProducer = kafka.producer()

const sendCollisionMessage = async (node1, node2) => {
  try {
    const message = collision.toBuffer({
      collisionNodes: [{
        id: node1.id,
        type: NODE_TYPES.PLAYER,
        title: node1.title,
        position: node1.position,
        radius: node1.radius,
      }, {
        id: node2.id,
        type: node2.type,
        title: node2.title,
        position: node2.position,
        radius: node2.radius,
      }],
    })

    await collisionProducer.send({
      topic: config.collisionTopic,
      messages: [{
        value: message,
      }],
      acks: 1,
    })
  } catch (e) {
    console.log(e)
  }
}
const checkCollision = async (node1, node2) => {
  const dx = node1.position.x - node2.position.x
  const dy = node1.position.y - node2.position.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist < node1.radius + node2.radius) {
    sendCollisionMessage(node1, node2)
  }
}

const checkForCollisions = async (message) => {
  const { playerNodes, cols } = message

  playerNodes.forEach((node) => {
    if (node.position.x + node.radius >= gameOptions.GRID_SIZE
      || node.position.x - node.radius <= 0
      || node.position.y + node.radius >= gameOptions.GRID_SIZE
      || node.position.y - node.radius <= 0) {
      sendCollisionMessage(node, {
        id: NODE_TYPES.BOUNDARIES,
        type: NODE_TYPES.BOUNDARIES,
        title: NODE_TYPES.BOUNDARIES,
        position: {
          x: gameOptions.GRID_SIZE,
          y: gameOptions.GRID_SIZE,
        },
        radius: 0,
      })
    } else {
      const { x, y } = node.gridIndices
      const xIndices = []
      const yIndices = []

      if (x >= 1) xIndices.push(x - 1)
      xIndices.push(x)
      if (x < cols.length - 1) xIndices.push(x + 1)
      if (y >= 1) yIndices.push(y - 1)
      yIndices.push(y)
      if (y < cols[0].rows.length - 1) yIndices.push(y + 1)

      xIndices.forEach((xI) => {
        yIndices.forEach((yI) => {
          cols[xI].rows[yI].nodes.forEach((n) => {
            if (n.id !== node.id) checkCollision(node, n)
          })
        })
      })
    }
  })
}

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.collisionTopic,
    numPartitions: 4,
    replicationFactor: 1,
  },
  {
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

const startConsumer = async () => {
  await gridConsumer.connect()

  await gridConsumer.subscribe({ topic: config.gridTopic, fromBeginning: false })

  await gridConsumer.run({
    eachMessage: async (event) => {
      const message = gridPositions.fromBuffer(event.message.value)
      checkForCollisions(message)
    },
  })
}

const startProducer = async () => {
  await collisionProducer.connect()
}

const run = async () => {
  await createTopics()
  await startConsumer()
  await startProducer()
}

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.forEach((type) => {
  process.on(type, async (e) => {
    try {
      console.log(`process.on ${type}`)
      console.error(e)
      await gridConsumer.disconnect()
      await collisionProducer.disconnect()
      process.exit(0)
    } catch (_) {
      process.exit(1)
    }
  })
})

signalTraps.forEach((type) => {
  process.once(type, async () => {
    try {
      await gridConsumer.disconnect()
      await collisionProducer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})

module.exports = {
  run,
}
