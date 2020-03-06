module.exports = {
  name: 'UserPosition',
  type: 'record',
  fields: [
    { name: 'userId', type: 'string' },
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ],
};