const dns = require('dns');
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to your environment variables.');
    process.exit(1);
  }
  // Optional: some networks (e.g. a phone hotspot) answer the mongodb+srv lookup in a way Node rejects
  // (querySrv EBADRESP). DNS_SERVERS=1.1.1.1,8.8.8.8 makes Node ask those servers instead.
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
  }
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
