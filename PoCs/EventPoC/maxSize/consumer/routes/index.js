const avro = require('avsc');
const express = require('express');
const router = express.Router();

const axios = require('axios');
const { Kafka } = require('kafkajs');
const config = require('../config');

const schema = require('../../avro_schemas/userPosition');
const positions = avro.Type.forSchema(schema.userPositions);

const kafka = new Kafka({
  clientId: 'consumer',
  brokers: [config.kafkaHost],
});
 
const consumer = kafka.consumer({ groupId: 'test-group' });
let startDate = null;
let count = 0;

const startUp = async () => {
  await consumer.connect();

  await consumer.subscribe({ topic: config.kafkaTopic });

  await consumer.run({
    eachMessage: async (event) => {
      count += 1;

      if (count >= 60) {
        console.log('time: ', new Date().getTime() - startDate.getTime());
      };
    },
  });

  const errorTypes = ['unhandledRejection', 'uncaughtException']
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

  errorTypes.map(type => {
    process.on(type, async e => {
      try {
        console.log(`process.on ${type}`)
        console.error(e)
        await consumer.disconnect()
        process.exit(0)
      } catch (_) {
        process.exit(1)
      }
    })
  })

  signalTraps.map(type => {
    process.once(type, async () => {
      try {
        await consumer.disconnect()
      } finally {
        process.kill(process.pid, type)
      }
    })
  })
};

const run = async () => {
  startDate = new Date();
  count = 0;
};

startUp().catch(console.error);

router.post('/', async function(req, res, next) {
  numberOfItems = req.body.numberOfItems || 100;

  try {
    await run();

    await axios.post('http://localhost:3000/', {
      numberOfItems,
    });
  } catch (e) {
    console.error(e)
  }

  res.send('finished');
});

module.exports = router;