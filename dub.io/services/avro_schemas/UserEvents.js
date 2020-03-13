const nodes = require('./Nodes')
const events = require('../../UserEvents')

const userEvents = {
  name: 'Collision',
  type: 'record',
  fields: [
    { name: 'user', type: nodes.node },
    { name: 'event', type: { name: 'EVENT', type: 'enum', symbols: Object.keys(events).map((key) => events[key]) }},
    { name: 'value', type: ['float', 'null'] },
  ],
}

module.exports = userEvents
