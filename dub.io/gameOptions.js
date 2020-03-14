const config = require('./config')

module.exports = {
  GRID_SIZE: 100,
  FPS: 60,
  GROW_FACTOR: 0.05,
  FOOD_RADIUS: 0.5,
  FOOD_NODE_AMOUNT: 90,
  DEFAULT_FOOD_SPRITE: `${config.http}${config.host}:8080/food.png`,
  OBSTACLE_MIN_RADIUS: 3,
  OBSTACLE_MAX_RADIUS: 8,
  OBSTACLE_MAX_LIFE_TIME: 50000,
  OBSTACLE_MIN_LIFE_TIME: 10000,
  DEFAULT_OBSTACLE_SPRITE: `${config.http}${config.host}:8080/safezone.png`,
  DEFAULT_INVULNERABILITY_TIME: 100,
  DEFAULT_INVULNERABILITY_SPRITE: `${config.http}${config.host}:8080/invulnerable.png`,
  PLAYER_RADIUS: 1,
  PLAYER_SPEED: 3,
  PLAYER_RESET_FACTOR: 0.25,
  DEFAULT_PLAYER_SPRITE: `${config.http}${config.host}:8080/player.png`,
}
