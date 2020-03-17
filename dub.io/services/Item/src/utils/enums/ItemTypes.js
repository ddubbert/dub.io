const gameOptions = require('../../../../../gameOptions')
const USER_EVENTS = require('../../../../../UserEvents')

module.exports = Object.freeze({
  SPEEDUP: {
    title: 'SPEEDUP',
    sprite: gameOptions.DEFAULT_ITEM_SPEEDUP_SPRITE,
    color: '#FE6B64',
    activeTime: gameOptions.DEFAULT_ITEM_ACTIVE_TIME,
    value: gameOptions.DEFAULT_SPEEDUP_FACTOR,
    userEvent: USER_EVENTS.SPEED_UP,
  },
  INVULNERABLE: {
    title: 'INVULNERABLE',
    sprite: gameOptions.DEFAULT_ITEM_INVULNERABILITY_SPRITE,
    color: '#FDFD98',
    activeTime: gameOptions.DEFAULT_ITEM_ACTIVE_TIME * 0.5,
    value: null,
    userEvent: USER_EVENTS.INVULNERABLE,
  },
  GROWUP: {
    title: 'GROWUP',
    sprite: gameOptions.DEFAULT_ITEM_GROWUP_SPRITE,
    color: '#B29DD9',
    activeTime: gameOptions.DEFAULT_ITEM_ACTIVE_TIME,
    value: gameOptions.DEFAULT_GROWUP_FACTOR,
    userEvent: USER_EVENTS.GROW_UP,
  },
})
