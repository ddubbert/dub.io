const { Kafka } = require('kafkajs');
const express = require('express');
const router = express.Router();

const config = require('../config');

const kafka = new Kafka({
  clientId: 'producer',
  brokers: [config.kafkaHost],
});

const admin = kafka.admin();
 
const producer = kafka.producer();

const run = async () => {
  const topicsToCreate = [{
    topic: config.kafkaTopic,
    numPartitions: 1,
    replicationFactor: 1,
  }];

  await admin.connect();

  try {
    await admin.fetchTopicMetadata({ topics: [config.kafkaTopic] });
  } catch(e) {
    console.error(e);
    
    await admin.createTopics({
      topics: topicsToCreate,
    });
  }

  await admin.disconnect();

  await producer.connect();
};

run().catch(console.error);

/* POST to start test. */
router.post('/', async function(req, res, next) {
  res.send('Starting');
  for(let i = 0; i < 1000; i += 1) {
    try {
      await producer.send({
        topic: config.kafkaTopic,
        messages: [{ value: `Event-${i}` }],
      });
    } catch(e) {
      console.log(`[kafka-producer -> ${config.kafkaTopic}]: broker update failed`);
      console.error(e);
    }
  }
});

module.exports = router;
