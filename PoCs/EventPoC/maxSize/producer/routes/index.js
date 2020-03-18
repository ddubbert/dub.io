const avro = require('avsc');
const sizeOf = require('object-sizeof');
const { Kafka } = require('kafkajs');
const express = require('express');
const router = express.Router();

const config = require('../config');

const schema = require('../../avro_schemas/userPosition');
const positions = avro.Type.forSchema(schema.userPositions);

const kafka = new Kafka({
  clientId: 'producer',
  brokers: [config.kafkaHost],
});

const admin = kafka.admin();
 
const producer = kafka.producer();

const run = async () => {
  const topicsToCreate = [{
    topic: config.kafkaTopic,
    numPartitions: 3,
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
  const numberOfItems = req.body.numberOfItems || 100;
  
  const object = { 
    userId: `100`,
    x: 100,
    y: 150
  };

  const positionObjects = { positions: [...Array(numberOfItems).keys()].map(() => object) };
  const message = positions.toBuffer(positionObjects);
  console.log(sizeOf(message));

  for(let i = 0; i < 60; i += 1) {
    try {
      await producer.send({
        topic: config.kafkaTopic,
        messages: [{
          value: message,
        }],
        acks: 0,
      });
    } catch(e) {
      console.log(`[kafka-producer -> ${config.kafkaTopic}]: broker update failed`);
      console.error(e);
    }
  }

  setTimeout(() => { res.send('finished'); }, 5000);
});

module.exports = router;
