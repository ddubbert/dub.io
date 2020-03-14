const avro = require('avsc')
// const sizeOf = require('object-sizeof')
const { Kafka } = require('kafkajs')

const NODE_TYPES = require('../../../../NodeTypes')

const nodePositionsSchema = require('../../../avro_schemas/NodePositions')
const gridPositionsSchema = require('../../../avro_schemas/GridPositions')
const config = require('../../../../config')
const gameOptions = require('../../../../gameOptions')

const nodes = {}
let changed = false

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
  const currentNodes = { ...nodes }
  let count = 0
  const playerNodes = []

  const maxRadius = Object.keys(currentNodes).reduce(
    (acc, nodeType) => currentNodes[nodeType].reduce(
      (innerAcc, node) => {
        count += 1
        return (node.radius > innerAcc) ? node.radius : innerAcc
      },
      acc,
    ),
    0,
  )

  const cellSize = (count > 100) ? maxRadius * 2 : gameOptions.GRID_SIZE

  const amountCells = Math.floor(gameOptions.GRID_SIZE / cellSize)

  const cols = [...Array(amountCells).keys()].map(() => {
    const rows = [...Array(amountCells).keys()].map(() => ({ nodes: [] }))
    return { rows }
  })

  Object.keys(currentNodes).forEach(
    (nodeType) => currentNodes[nodeType].forEach(
      (node) => {
        const x = Math.max(
          Math.min(Math.floor(node.position.x / maxRadius), amountCells - 1),
          0,
        )
        const y = Math.max(
          Math.min(Math.floor(node.position.y / maxRadius), amountCells - 1),
          0,
        )
        cols[x].rows[y].nodes.push(node)
        if (nodeType === NODE_TYPES.PLAYER) playerNodes.push({ ...node, gridIndices: { x, y } })
      },
    ),
  )

  return {
    cellSize,
    cols,
    playerNodes,
  }
}

const startPublishing = () => {
  setInterval(async () => {
    if (Object.keys(nodes).length > 0 && changed) {
      const message = gridPositions.toBuffer(createGrid())

      await gridProducer.send({
        topic: config.gridTopic,
        messages: [{
          value: message,
        }],
        acks: 0,
      })

      changed = false
    }
  }, 1000 / gameOptions.FPS)
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
      changed = true
    },
  })
}

const startProducer = async () => {
  await gridProducer.connect()
}

const run = async () => {
  await createTopics()
  await startConsumer()
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
