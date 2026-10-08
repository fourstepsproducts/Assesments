import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/assessment_db');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // If local mongodb is not running, log instruction
    console.log('Ensure MongoDB server is running locally or MONGO_URI is set correctly in .env');
  }
};

export default connectDB;
