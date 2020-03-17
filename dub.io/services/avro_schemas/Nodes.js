const position = require('./Position')

const node = {
  name: 'Node',
  type: 'record',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'position', type: position },
    { name: 'radius', type: 'float' },
    { name: 'sprite', type: ['null', 'string'] },
    { name: 'color', type: ['null', 'string'] },
  ],
}

const gridIndices = {
  name: 'GridIndices',
  type: 'record',
  fields: [
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ],
}

const playerNode = {
  name: 'GridNode',
  type: 'record',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'position', type: 'Position' },
    { name: 'radius', type: 'float' },
    { name: 'sprite', type: ['null', 'string'] },
    { name: 'color', type: ['null', 'string'] },
    { name: 'gridIndices', type: gridIndices }
  ],
}

module.exports = {
  node,
  playerNode,
}
