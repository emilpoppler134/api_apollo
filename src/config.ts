import unwrap from 'ts-unwrap';
import dotenv from 'dotenv';

dotenv.config();

export const FIREBASE_CREDENTIALS = unwrap(JSON.parse(process.env.FIREBASE_CREDENTIALS || ""));
export const FIREBASE_DATABASE_URL = unwrap(process.env.FIREBASE_DATABASE_URL);

export const STRIPE_PUBLIC_KEY = unwrap(process.env.STRIPE_PUBLIC_KEY);
export const STRIPE_SECRET_KEY = unwrap(process.env.STRIPE_SECRET_KEY);