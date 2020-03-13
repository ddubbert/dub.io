const CHANNELS = require('../utils/enums/ChannelNames')

module.exports = (renderHandler) => ({
  Query: {
    getGrid: () => renderHandler.getGrid(),
  },
  Subscription: {
    renderUpdate: {
      subscribe: (_parent, _args, context, _info) => {
        const { pubsub } = context
        setTimeout(() => {
          const grid = renderHandler.getGrid()
          if (grid) pubsub.publish(CHANNELS.RENDER_UPDATE_CHANNEL, { renderUpdate: grid })
        }, 500)
        return pubsub.asyncIterator(CHANNELS.RENDER_UPDATE_CHANNEL)
      },
    },
  },
})
