// MongoDB connection configuration
// Establishes connection to MongoDB using Mongoose

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Mongoose 8.x no longer requires useNewUrlParser and useUnifiedTopology options
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

