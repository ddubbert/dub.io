const events = require('../../UserEvents')

const userEvents = {
  name: 'UserEvent',
  type: 'record',
  fields: [
    { name: 'userId', type: 'string' },
    { name: 'event', type: { name: 'EVENT', type: 'enum', symbols: Object.keys(events).map((key) => events[key]) }},
    { name: 'value', type: ['float', 'null'] },
    { name: 'activeTime', type: ['float', 'null'] },
  ],
}

module.exports = userEvents
