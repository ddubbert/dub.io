const axios = require('axios');
const express = require('express');
const router = express.Router();

/* POST to start test. */
router.post('/', async function(req, res, next) {
  const numberOfEvents = req.body.numberOfEvents || 1000;
  console.log(new Date().getTime());

  axios.post('http://localhost:3004/', {
    numberOfEvents,
  });

  axios.post('http://localhost:3005/', {
    numberOfEvents,
  });

  axios.post('http://localhost:3006/', {
    numberOfEvents,
  });

  res.send('finished');
});

module.exports = router;
