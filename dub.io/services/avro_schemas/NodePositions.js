const nodes = require('./Nodes')

const nodePositions = {
  name: 'NodePositions',
  type: 'record',
  fields: [
    { name: 'type', type: 'string'},
    { name: 'nodes', type: { type: 'array', items: nodes.node }},
  ],
}

module.exports = nodePositions
