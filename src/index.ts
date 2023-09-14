import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import * as Customers from './entity/customers.js';
import * as Orders from './entity/orders.js';
import * as Products from './entity/products.js';

const server = new ApolloServer({
  resolvers: [
    Customers.resolvers,
    Products.resolvers,
    Orders.resolvers
  ],
  typeDefs: [
    Customers.typeDefs,
    Products.typeDefs,
    Orders.typeDefs
  ],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);