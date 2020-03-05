const { Kafka } = require('kafkajs');
const express = require('express');
const router = express.Router();

const config = require('../config');

const kafka = new Kafka({
  clientId: 'producer2',
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
    console.log(await admin.fetchTopicMetadata({ topics: [config.kafkaTopic] }));
  }

  await admin.disconnect();

  await producer.connect();
};

run().catch(console.error);

/* POST to start test. */
router.post('/', async function(req, res, next) {
  const numberOfEvents = req.body.numberOfEvents || 1000;
  console.log(new Date().getTime());

  for(let i = 0; i < numberOfEvents; i += 1) {
    try {
      await producer.send({
        topic: config.kafkaTopic,
        messages: [{ value: `Event-${i}` }],
        acks: 0,
      });
    } catch(e) {
      console.log(`[kafka-producer -> ${config.kafkaTopic}]: broker update failed`);
      console.error(e);
    }
  }

  res.send('finished');
});

module.exports = router;
