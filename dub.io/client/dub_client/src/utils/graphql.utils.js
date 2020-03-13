import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { WebSocketLink } from 'apollo-link-ws';
import { split } from 'apollo-link';
import { getMainDefinition } from 'apollo-utilities';

const create = (httpURI, socketURI) => {
  // Create an http link:
  const httpLink = new HttpLink({
    uri: httpURI,
  });

  // using the ability to split links, you can send data to each link
  // depending on what kind of operation is being sent
  const link = (socketURI) ? split(
    // split based on operation type
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition'
        && definition.operation === 'subscription'
      );
    },
    new WebSocketLink({
      uri: socketURI,
      options: {
        reconnect: true,
      },
    }),
    httpLink,
  ) : httpLink;

  return new ApolloClient({
    // Provide the URL to the API server.
    link,
    // Using a cache for blazingly
    // fast subsequent queries.
    cache: new InMemoryCache(),
  });
};

export default create;
