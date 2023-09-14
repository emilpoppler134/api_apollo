import admin from 'firebase-admin';
import { FIREBASE_CREDENTIALS, FIREBASE_DATABASE_URL } from '../config.js';

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_CREDENTIALS),
  databaseURL: FIREBASE_DATABASE_URL
});

const db = admin.firestore();

export default db;