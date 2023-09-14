import db from '../util/firebase.js';

export const typeDefs = `
  type Customer {
    customerID: String!
    name: String!
    email: String!
    phone: String!
    timestamp: String!

    shipping_address: Address!
    billing_address: Address!
  }

  type Address {
    line1: String!
    line2: String
    postal_code: String!
    state: String
    city: String!
    country: String!
    location: Location
  }

  type Location {
    latitude: Float!
    longitude: Float!
  }

  type Query {
    customers: [Customer!]!
    customer: Customer!
  }
`;

export const resolvers = {
  Query: {
    customers: async () => {
      const snapshot = await db.collection('customers').get();

      return snapshot.docs.map(async (doc) => {
        return doc.data();
      });
    },
    customer: async (_: undefined, { id }: { id: string}) => {
      const doc = await db.collection('customers').doc(id).get();
  
      if (!doc.exists) {
        throw new Error(`No customer found with ID ${id}`);
      }
  
      return doc.data();
    },
  },
};