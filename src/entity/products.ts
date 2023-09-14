import { Timestamp } from 'firebase-admin/firestore';

import db from '../util/firebase.js';

export const typeDefs = `
  type Product {
    name: String!
    articleNumber: Int!
    description: String
    active: Int!

    prices: [Price!]!
    
    images: [Image!]!

    created: String!
    updated: String!
  }

  type Price {
    size: String!
    price: Int!
    discountedPrice: Int
    quantity: Int!
  }

  type Image {
    type: String!
    key: String
  }

  input ProductInput {
    name: String!
    description: String
    active: Int!
  }

  input PriceInput {
    price: Int!
    discountedPrice: Int
    size: String!
    quantity: Int!
  }

  input ImageInput {
    type: String!
    key: String!
  }

  type Query {
    products: [Product]
    product(id: String!): Product!
  }

  type Mutation {
    addProduct(product: ProductInput, prices: [PriceInput], images: [ImageInput]): Product
    updateProduct(id: String!, product: ProductInput): Product
    removeProduct(id: String!): Boolean
  }
`;

interface ProductInput {
  name: string,
  description: string,
  active: number
}

interface PriceInput {
  price: number,
  discountedPrice: number,
  size: string,
  quantity: number
}

interface ImageInput {
  type: string,
  key: string
}

export const resolvers = {
  Query: {
    products: async () => {
      const snapshot = await db.collection('products').orderBy('created', 'desc').get();

      return snapshot.docs.map(async (doc) => {
        const productData = doc.data();

        const pricesSnapshot = await db.collection('prices').where('productID', '==', doc.id).get();
        const prices = pricesSnapshot.docs.map(priceDoc => priceDoc.data());

        const imagesSnapshot = await db.collection('images').where('productID', '==', doc.id).get();
        const images = imagesSnapshot.docs.map(imageDoc => imageDoc.data());

        return {
          ...productData,
          prices: prices,
          images: images,
        };
      });
    },
    product: async (_: undefined, { id }: { id: string }) => {
      const doc = await db.collection('products').doc(id).get();
  
      if (!doc.exists) {
        throw new Error(`No product found with ID ${id}`);
      }
  
      const productData = doc.data();
  
      const pricesSnapshot = await db.collection('prices').where('productID', '==', doc.id).get();
      const prices = pricesSnapshot.docs.map(priceDoc => priceDoc.data());
  
      const imagesSnapshot = await db.collection('images').where('productID', '==', doc.id).get();
      const images = imagesSnapshot.docs.map(imagesDoc => imagesDoc.data());
  
      return {
        ...productData,
        prices: prices,
        images: images,
      };
    },
  },
  Mutation: {
    addProduct: async (_: undefined, { product, prices, images }: { product: ProductInput, prices: [PriceInput], images: [ImageInput] }) => {
      const productRef = db.collection("products");
      const productSnapshot = await productRef.orderBy('created', 'desc').limit(1).get();

      const articleNumber = productSnapshot.empty ? 1 : productSnapshot.docs[0].data().articleNumber + 1;
      const current_timestamp = Timestamp.fromDate(new Date());

      const productParams = {
        articleNumber: articleNumber,
        name: product.name,
        description: product.description,
        active: product.active,
        created: current_timestamp,
        updated: current_timestamp
      }

      const productResponse = await db.collection("products").add(productParams);

      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];

        const priceParams = {
          price: price.price,
          discountedPrice: price.discountedPrice,
          size: price.size,
          quantity: price.quantity,
          productID: productResponse.id
        }
  
        await db.collection("prices").add(priceParams);
      }

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        const imageParams = {
          type: image.type,
          key: image.key,
          productID: productResponse.id
        }
  
        await db.collection("images").add(imageParams);
      }

      return {
        ...productParams,
        prices: prices,
        images: images,
      };
    },
    updateProduct: async (_: undefined, { id, product }: { id: string, product: ProductInput }) => {
      // implementation code for updateProduct mutation
    },
    removeProduct: async (_: undefined, { id }: { id: string }) => {
      const productRef = db.collection('products').doc(id);
      const productData = await productRef.get();
  
      if (!productData.exists) {
        throw new Error(`No product found with ID ${id}`);
      }
  
      // Delete the product
      await productRef.delete();
  
      // Delete the prices
      const pricesRef = db.collection('prices').where('productID', '==', id);
      const pricesSnapshot = await pricesRef.get();
      const priceDocs = pricesSnapshot.docs.map(doc => doc.ref);
      await db.runTransaction(async (transaction) => {
        priceDocs.forEach(priceDoc => transaction.delete(priceDoc));
      });
  
      // Delete the images
      const imagesRef = db.collection('images').where('productID', '==', id);
      const imagesSnapshot = await imagesRef.get();
      const imageDocs = imagesSnapshot.docs.map(doc => doc.ref);
      await db.runTransaction(async (transaction) => {
        imageDocs.forEach(imageDoc => transaction.delete(imageDoc));
      });
  
      return true;
    },
  },
};