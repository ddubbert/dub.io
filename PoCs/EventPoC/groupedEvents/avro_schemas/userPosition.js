const userPosition = {
  name: 'UserPosition',
  type: 'record',
  fields: [
    { name: 'userId', type: 'string' },
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ],
};

const userPositions = {
  name: 'UserPositions',
  type: 'record',
  fields: [
    { name: 'positions', type: { type: 'array', items: userPosition }},
  ],
};

module.exports = {
  userPosition,
  userPositions,
}
