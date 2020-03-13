const nodes = require('./Nodes')

const row = {
  name: 'Row',
  type: 'record',
  fields: [
    { name: 'nodes', type: { type: 'array', items: nodes.node }},
  ],
}

const col = {
  name: 'Cell',
  type: 'record',
  fields: [
    { name: 'rows', type: { type: 'array', items: row }},
  ],
}

const gridPositions = {
  name: 'GridPositions',
  type: 'record',
  fields: [
    { name: 'cellSize', type: 'float' },
    { name: 'cols', type: { type: 'array', items: col }},
    { name: 'playerNodes', type: { type: 'array', items: nodes.gridNode }}
  ],
}

module.exports = gridPositions
