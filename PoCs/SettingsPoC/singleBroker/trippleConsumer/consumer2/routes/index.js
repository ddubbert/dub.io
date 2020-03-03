const express = require('express');
const router = express.Router();

const { Kafka } = require('kafkajs');
const config = require('../config');

const kafka = new Kafka({
  clientId: 'consumer2',
  brokers: [config.kafkaHost],
});
 
const consumer = kafka.consumer({ groupId: 'test-group' });

const startUp = async () => {
  await consumer.connect();

  await consumer.subscribe({ topic: config.kafkaTopic });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {

      console.log({
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString(),
      });

      console.log(new Date().getTime());
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

startUp().catch(console.error);

module.exports = router;
