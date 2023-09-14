import db from '../util/firebase.js';
import chargeResolver from '../resolvers/charge.js';

export const typeDefs = `
  type Order {
    orderID: String!
    customerID: String!
    productIDs: [String!]!

    status: String!
    timestamp: String!
    amount: Int!

    line_items: [Item!]!
    shipping_address: Address!
  }

  type Item {
    name: String!
    amount: Int!
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
    orders: [Order!]!
    order: Order!
  }

  input ChargeInput {
    name: String!
    email: String!
    phone: String!

    line1: String!
    line2: String
    postal_code: String!
    city: String!
    state: String
    country: String!

    number: String!
    exp_month: Int!
    exp_year: Int!
    cvc: String!

    promotion_code: String

    productIDs: [String!]!
  }

  type Mutation {
    charge(input: ChargeInput!): Order
    updateOrderStatus(id: String!, status: String!): Boolean
  }
`;

export const resolvers = {
  Query: {
    orders: async () => {
      const snapshot = await db.collection('orders').get();

      return snapshot.docs.map(async (doc) => {
        return doc.data();
      });
    },
    order: async (_: undefined, { id }: { id: string}) => {
      const doc = await db.collection('orders').doc(id).get();
  
      if (!doc.exists) {
        throw new Error(`No order found with ID ${id}`);
      }
  
      return doc.data();
    },
  },
  Mutation: {
    charge: chargeResolver,
    updateOrderStatus: async (_: undefined, { id, status }: { id: string, status: string }) => {
      const docRef = db.collection('orders').doc(id);
      const doc = await docRef.get();
  
      if (!doc.exists) {
        throw new Error(`No order found with ID ${id}`);
      }

      await docRef.update({
        status: status
      });

      return true;
    }
  },
};