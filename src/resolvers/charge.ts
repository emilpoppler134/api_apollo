import Stripe from 'stripe';
import { Timestamp } from 'firebase-admin/firestore';

import client from '../util/stripe.js';
import db from '../util/firebase.js';

interface ChargeInput {
  name: string,
  email: string,
  phone: string,

  line1: string,
  line2: string,
  postal_code: string,
  city: string,
  state: string,
  country: string,

  number: string,
  exp_month: string,
  exp_year: string,
  cvc: string,

  promotion_code: string

  productIDs: [string]
}

export default async function charge(_: undefined, input: ChargeInput) {
  let line_items = [];
  let total = 0;

  for (let i = 0; i < input.productIDs.length; i++) {
    const id = input.productIDs[i];

    // Get price data
    const priceRef = db.collection('prices').doc(id);
    const priceDoc = await priceRef.get();

    // If document exist
    if (!priceDoc.exists) {
      throw new Error(`PRICE EXISTS ERROR ${id}`);
    }
    const price = priceDoc.data();

    if (typeof price === "undefined") {
      throw new Error(`PRICE EXISTS ERROR ${id}`);
    }

    // if inStock
    if (price.quantity === 0) {
      throw new Error(`QUANTITY ERROR ${id}`);
    }

    // get product data
    const productRef = db.collection('products').doc(price.productID);
    const productDoc = await productRef.get();

    // if product exist
    if (!productDoc.exists) {
      throw new Error(`PRODUCT EXISTS ERROR ${id}`);
    }
    const product = productDoc.data();

    if (typeof product === "undefined") {
      throw new Error(`PRODUCT EXISTS ERROR ${id}`);
    }

    // if product is active
    if (product.active === 0) {
      throw new Error(`ACTIVE ERROR ${id}`);
    }

    const amount = price.discounted_price !== null ? price.discounted_price : price.price;

    line_items.push({
      name: product.name,
      amount: amount
    });

    total = total + amount;
  }


  if (input.promotion_code !== null) {
    const code = input.promotion_code.toUpperCase();
    const promoRef = db.collection('promotion_codes');
    const snapshot = await promoRef.where('code', '==', code).get();

    if (snapshot.empty) {
      throw new Error(`PROMOTION CODE DOESN'T EXIST`);
    }  
    
    const promotion_code = snapshot.docs[0].data();

    if (promotion_code.amount_off !== null) {
      total = total - promotion_code.amount_off;
      line_items.push({ name: `Promotion code ${promotion_code.code}`, amount: `-${promotion_code.amount_off}`})
    }
    if (promotion_code.percent_off !== null) {
      if (promotion_code.percent_off > 100) {
        throw new Error(`PROMOTION CODE ERROR`);
      }
      const percentageOfamount = 1 - (promotion_code.percent_off / 100);
      const amount_off = percentageOfamount * total;
      total = total - amount_off;
      line_items.push({ name: `Promotion code ${promotion_code.code}`, amount: `-${promotion_code.percent_off}%`})
    }

    // if amount is less than 0 after promotion code - cancel order
    if (total < 0) {
      throw new Error(`AMOUNT NEGATIVE`);
    }
  }


  // Add shipping fee
  const shippingRef = db.collection('shipping_countries').doc(input.country);
  const shippingDoc = await shippingRef.get();
  if (!shippingDoc.exists) {
    throw new Error(`SHIPPING COUNTRY DOESN'T EXIST`);
  }
  const shipping_country = shippingDoc.data();

  if (typeof shipping_country === "undefined") {
    throw new Error(`SHIPPING COUNTRY DOESN'T EXIST`);
  }

  total = total + shipping_country.fee;
  line_items.push({ name: "Shipping", amount: shipping_country.fee });


  let paymentIntent: Stripe.Response<Stripe.PaymentIntent>;
  let customer: Stripe.Response<Stripe.Customer>;

  try {
    const tokenCreateParams: Stripe.TokenCreateParams = {
      card: {
        number: input.number,
        exp_month: input.exp_month,
        exp_year: input.exp_year,
        cvc: input.cvc,
      }
    }
    const token = await client.tokens.create(tokenCreateParams);


    const customerCreateParams: Stripe.CustomerCreateParams = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: {
        line1: input.line1,
        line2: input.line2,
        postal_code: input.postal_code,
        state: input.state,
        city: input.city,
        country: shipping_country.code
      },
      source: token.id
    }
    customer = await client.customers.create(customerCreateParams);

    
    const paymentIntentCreateParams: Stripe.PaymentIntentCreateParams = {
      amount: total * 100,
      currency: 'sek',
      confirm: true,
      customer: customer.id,
      receipt_email: input.email,
      shipping: {
        name: input.name,
        phone: input.phone,
        address: {
          line1: input.line1,
          line2: input.line2,
          postal_code: input.postal_code,
          state: input.state,
          city: input.city,
          country: shipping_country.code
        }
      },
    }
    paymentIntent = await client.paymentIntents.create(paymentIntentCreateParams);
  } catch(err) {
    throw new Error(`STRIPE ERROR ${err}`);
  }

  const current_timestamp = Timestamp.fromDate(new Date());

  const order = {
    orderID: paymentIntent.id,
    customerID: customer.id,
    productIDs: input.productIDs,

    status: "Order Placed",
    timestamp: current_timestamp,
    amount: total,

    line_items: line_items,

    shipping_address: {
      line1: input.line1,
      line2: input.line2,
      postal_code: input.postal_code,
      state: input.state,
      city: input.city,
      country: shipping_country.name,
      location: {
        latitude: 0.1,
        longitude: 0.2
      }
    }
  }

  db.collection("orders").add(order);

  db.collection("customers").add({
    customerID: customer.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    timestamp: current_timestamp,

    billing_address: {
      line1: input.line1,
      line2: input.line2,
      postal_code: input.postal_code,
      state: input.state,
      city: input.city,
      country: shipping_country.name
    },

    shipping_address: {
      line1: input.line1,
      line2: input.line2,
      postal_code: input.postal_code,
      state: input.state,
      city: input.city,
      country: shipping_country.name,
      location: {
        latitude: 0.1,
        longitude: 0.2
      }
    }
  });

  return order;
}