const { withFilter } = require('apollo-server')
const DIRECTIONS = require('../utils/enums/Directions')
const CHANNELS = require('../utils/enums/ChannelNames')

module.exports = (userHandler) => ({
  Query: {
    getUser: async (_parent, args, _context, _info) => userHandler.getUserById(args.userId),
  },
  Mutation: {
    createUser: async (_parent, args, _context, _info) => userHandler.createUser(args.data),
    changeDirection: async (_parent, args, _context, _info) => {
      const updated = userHandler.changeDirection(args.userId, args.newDirection)
      return updated
    },
  },
  Subscription: {
    userLost: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(CHANNELS.USER_LOST_CHANNEL),
        (payload, variables) => payload.userLost.id === variables.userId,
      ),
    },
  },
  User: {
    __resolveReference(reference) {
      return userHandler.getUserById(reference.id)
    },
  },
  Direction: {
    UP: DIRECTIONS.UP,
    DOWN: DIRECTIONS.DOWN,
    LEFT: DIRECTIONS.LEFT,
    RIGHT: DIRECTIONS.RIGHT,
    UPLEFT: DIRECTIONS.UPLEFT,
    UPRIGHT: DIRECTIONS.UPRIGHT,
    DOWNLEFT: DIRECTIONS.DOWNLEFT,
    DOWNRIGHT: DIRECTIONS.DOWNRIGHT,
  },
})
