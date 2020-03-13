const nodes = require('./Nodes')

const collisions = {
  name: 'Collision',
  type: 'record',
  fields: [
    { name: 'nodes', type: { type: 'array', items: nodes.node }}
  ],
}

module.exports = collisions
