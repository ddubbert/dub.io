module.exports = Object.freeze({
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UPLEFT: { x: -(1 / Math.sqrt(2)), y: -(1 / Math.sqrt(2)) },
  UPRIGHT: { x: 1 / Math.sqrt(2), y: -(1 / Math.sqrt(2)) },
  DOWNLEFT: { x: -(1 / Math.sqrt(2)), y: 1 / Math.sqrt(2) },
  DOWNRIGHT: { x: 1 / Math.sqrt(2), y: 1 / Math.sqrt(2) },
})
