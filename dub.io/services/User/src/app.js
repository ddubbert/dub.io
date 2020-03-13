require('dotenv').config()

const { ApolloServer, gql, PubSub } = require('apollo-server')
// const { buildFederatedSchema } = require('@apollo/federation')
const fs = require('fs')
const path = require('path')
const userHandler = require('./utils/userHandler')
const resolvers = require('./resolvers/user')(userHandler)
const config = require('../../../config')

const types = fs.readFileSync(path.join(__dirname, './schemas/user.graphql'), 'utf8')
const typeDefs = gql`${types}`

const pubsub = new PubSub()

// const schema = buildFederatedSchema([{ typeDefs: gql`${types}`, resolvers }])

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
    userHandler.run(pubsub).catch(console.error)
  })
