import mongoose from 'mongoose';

export async function connectDb(mongodbUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongodbUri);
}
