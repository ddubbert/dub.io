require('dotenv').config()

const {
  ApolloServer,
  gql,
  PubSub,
} = require('apollo-server')
const fs = require('fs')
const path = require('path')
const statisticHandler = require('./utils/statisticHandler')
const resolvers = require('./resolvers/statistic')(statisticHandler)
const config = require('../../../config')

const types = fs.readFileSync(path.join(__dirname, './schemas/statistic.graphql'), 'utf8')
const typeDefs = gql`${types}`

const pubsub = new PubSub()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: (req) => ({
    ...req,
    pubsub,
  }),
  playground: {
    endpoint: process.env.PLAYGROUND,
  },
  subscriptions: process.env.SUBSCRIPTIONS,
})

server.listen({ host: config.host, port: process.env.PORT, endpoint: process.env.ENDPOINT })
  .then(({ url, subscriptionsPath }) => {
    console.log(url)
    console.log(subscriptionsPath)
    console.log(`Server is running on ${url}`)
    statisticHandler.run(pubsub).catch(console.error)
  })
