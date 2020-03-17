const position = require('./Position')

const collisionNode = {
  name: 'CollisionNode',
  type: 'record',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'position', type: position },
    { name: 'radius', type: 'float' },
  ],
}

const collisions = {
  name: 'Collision',
  type: 'record',
  fields: [
    { name: 'collisionNodes', type: { type: 'array', items: collisionNode }}
  ],
}

module.exports = collisions
