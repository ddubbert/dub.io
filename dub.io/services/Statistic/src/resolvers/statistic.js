const CHANNELS = require('../utils/enums/ChannelNames')

module.exports = (statisticHandler) => ({
  Query: {
    getLeaderBoard: () => statisticHandler.getLeaderBoard(),
  },
  Subscription: {
    leaderBoardUpdates: {
      subscribe: (_parent, _args, context, _info) => {
        const { pubsub } = context
        setTimeout(() => {
          const leaderBoard = statisticHandler.getLeaderBoard()
          if (leaderBoard) {
            pubsub.publish(
              CHANNELS.BOARD_UPDATE_CHANNEL,
              { leaderBoardUpdates: leaderBoard },
            )
          }
        }, 500)
        return pubsub.asyncIterator(CHANNELS.BOARD_UPDATE_CHANNEL)
      },
    },
  },
})
