require('dotenv').config()

const { GraphQLServer } = require('graphql-yoga')
const { express: middleware } = require('graphql-voyager/middleware')

const fetch = require('node-fetch')
const {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
} = require('graphql-tools')
const WebSocket = require('ws')
const { HttpLink } = require('apollo-link-http')
const { WebSocketLink } = require('apollo-link-ws')
const { RetryLink } = require('apollo-link-retry')
const { SubscriptionClient } = require('subscriptions-transport-ws')
const { getMainDefinition } = require('apollo-utilities')

const config = require('../../config')

const endpoints = [
  `${config.host}:3001`,
  `${config.host}:3002`,
  `${config.host}:3007`,
]

function createHttpLink(url) {
  const uri = `${config.http}${url}${process.env.ENDPOINT}`
  return new HttpLink({ uri, fetch })
}

function createWsLink(url) {
  const wsUri = `${config.ws}${url}${process.env.SUBSCRIPTIONS}`
  const wsClient = new SubscriptionClient(
    wsUri,
    {
      reconnect: true,
    },
    WebSocket,
  )

  return new WebSocketLink(wsClient)
}

function createLink(url) {
  const httpLink = createHttpLink(url)
  const wsLink = createWsLink(url)

  const link = new RetryLink()
    .split(
      ({ query }) => {
        const { kind, operation } = getMainDefinition(query)
        return kind === 'OperationDefinition' && operation === 'subscription'
      },
      wsLink,
      httpLink,
    )

  return link
}

(async () => {
  const remoteSchemas = await Promise.all(endpoints.map(async (url) => {
    const link = createLink(url)

    return makeRemoteExecutableSchema({
      link,
      schema: await introspectSchema(link),
    })
  }))

  const fullSchema = mergeSchemas({
    schemas: [
      ...remoteSchemas,
    ],
  })

  const server = new GraphQLServer({
    schema: fullSchema,
    context: req => ({
      ...req,
    }),
  })

  server.express
    .use(process.env.VOYAGER, middleware({ endpointUrl: process.env.ENDPOINT }))

  const options = {
    port: process.env.PORT,
    playground: process.env.PLAYGROUND,
    endpoint: process.env.ENDPOINT,
    subscriptions: process.env.SUBSCRIPTIONS,
    debug: false,
  }

  server
    .start(options, () => console.log(`Server is running on ${config.http}${config.host}:${process.env.PORT}`))
})()
