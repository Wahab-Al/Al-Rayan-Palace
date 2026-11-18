import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import Product, { type IProduct } from './models/product.js';
import _config from './config/env.js';

const sample: Partial<IProduct>[] = [];

async function seed() {
  try {
    await connectDB(_config.MONGO_URI || '');
    await Product.deleteMany({});
    await Product.insertMany(sample);

    console.log('********** Seed completed ***********');
    process.exit(0);
  } catch (error) {
    console.error('Seed error', error);
    process.exit(1);
  }
}

await seed();
