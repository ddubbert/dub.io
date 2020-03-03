const createError = require('http-errors');
const express = require('express');
const { Kafka } = require('kafkajs');
const config = require('./config');

const app = express();

const kafka = new Kafka({
  clientId: 'consumer',
  brokers: [config.kafkaHost],
});
 
const consumer = kafka.consumer({ groupId: 'test-group' });

const run = async () => {
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
    },
  });
};

run().catch(console.error);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
