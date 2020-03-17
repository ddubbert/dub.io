const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')

const NODE_TYPES = require('../../../../NodeTypes')

const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const gridPositionsSchema = require('../../../avro_schemas/GridPositions')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const nodes = {}
// let changed = false

const nodePositions = avro.Type.forSchema(nodePositionsSchema)
const gridPositions = avro.Type.forSchema(gridPositionsSchema)

const kafka = new Kafka({
  clientId: 'NodeCollector-Service',
  brokers: [`${config.kafkaHost}:${config.kafkaPort}`],
})
const nodeConsumer = kafka.consumer({ groupId: 'collector-group' })
const admin = kafka.admin()
const gridProducer = kafka.producer()

const createGrid = () => {
  const maxRadiusPlayer = (nodes[NODE_TYPES.PLAYER] || []).reduce(
    (innerAcc, node) => (node.radius > innerAcc) ? node.radius : innerAcc,
    0,
  )

  const maxRadiusObstacle = (nodes[NODE_TYPES.OBSTACLE] || []).reduce(
    (innerAcc, node) => (node.radius > innerAcc) ? node.radius : innerAcc,
    0,
  )

  const maxSize = Math.max(maxRadiusPlayer * 2, maxRadiusObstacle * 2) || gameOptions.GRID_SIZE / 4

  const amountCells = Math.max(Math.floor(gameOptions.GRID_SIZE / maxSize), 1)

  const cellSize = gameOptions.GRID_SIZE / amountCells

  const cols = [...Array(amountCells).keys()].map(() => {
    const rows = [...Array(amountCells).keys()].map(() => ({ nodes: [] }))
    return { rows }
  })

  const playerNodes = []

  Object.keys(nodes).forEach(
    (nodeType) => nodes[nodeType].forEach(
      (node) => {
        const x = Math.max(
          Math.min(Math.floor(node.position.x / cellSize), amountCells - 1),
          0,
        )
        const y = Math.max(
          Math.min(Math.floor(node.position.y / cellSize), amountCells - 1),
          0,
        )
        cols[x].rows[y].nodes.push(node)

        if (nodeType === NODE_TYPES.PLAYER) {
          playerNodes.push({
            id: node.id,
            title: node.title,
            position: node.position,
            radius: node.radius,
            sprite: node.sprite,
            color: node.color,
            gridIndices: { x, y },
          })
        }
      },
    ),
  )

  return {
    cellSize,
    cols,
    playerNodes,
  }
}

const createTopics = async () => {
  const topicsToCreate = [{
    topic: config.nodeTopic,
    numPartitions: 1,
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
  await nodeConsumer.connect()

  await nodeConsumer.subscribe({ topic: config.nodeTopic, fromBeginning: false })

  await nodeConsumer.run({
    eachMessage: async (event) => {
      const message = nodePositions.fromBuffer(event.message.value)
      nodes[message.type] = message.nodes
      // changed = true

      const gridMessage = gridPositions.toBuffer(createGrid())

      await gridProducer.send({
        topic: config.gridTopic,
        messages: [{
          value: gridMessage,
        }],
        acks: 1,
      })
    },
  })
}

const startProducer = async () => {
  await gridProducer.connect()
}

// const startPublishing = () => {
//   setInterval(async () => {
//     if (Object.keys(nodes).length > 0 && changed) {
//       changed = false

//       const gridMessage = gridPositions.toBuffer(createGrid())

//       await gridProducer.send({
//         topic: config.gridTopic,
//         messages: [{
//           value: gridMessage,
//         }],
//         acks: 1,
//       })
//     }
//   }, 1000 / (gameOptions.FPS * 1.1))
// }

const run = async () => {
  await createTopics()
  await startProducer()
  await startConsumer()

  // startPublishing()
}

const errorTypes = ['unhandledRejection', 'uncaughtException']
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

errorTypes.forEach((type) => {
  process.on(type, async (e) => {
    try {
      console.log(`process.on ${type}`)
      console.error(e)
      await nodeConsumer.disconnect()
      await gridProducer.disconnect()
      process.exit(0)
    } catch (_) {
      process.exit(1)
    }
  })
})

signalTraps.forEach((type) => {
  process.once(type, async () => {
    try {
      await nodeConsumer.disconnect()
      await gridProducer.disconnect()
    } finally {
      process.kill(process.pid, type)
    }
  })
})

module.exports = {
  run,
}
