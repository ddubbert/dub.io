const express = require('express');
const router = express.Router();

const axios = require('axios');
const { Kafka } = require('kafkajs');
const config = require('../config');

const kafka = new Kafka({
  clientId: 'consumer',
  brokers: [config.kafkaHost],
});
 
const consumer = kafka.consumer({ groupId: 'test-group' });
let startDate = null;
let numberOfEvents = 1000;
let count = 0;

const startUp = async () => {
  await consumer.connect();

  await consumer.subscribe({ topic: config.kafkaTopic });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      count += 1;

      console.log({
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString(),
      });

      if (count >= numberOfEvents) {
        console.log(new Date().getTime() - startDate.getTime());
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
  numberOfEvents = req.body.numberOfEvents || 1000;

  try {
    await run(numberOfEvents);

    await axios.post('http://localhost:3000/', {
      numberOfEvents,
    });
  } catch (e) {
    console.error(e)
  }

  res.send('finished');
});

module.exports = router;
