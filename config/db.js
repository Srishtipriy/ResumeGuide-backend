
const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db("resumeguide_clone");

  console.log("MongoDB connected successfully!");

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("MongoDB is not connected. Call connectDB() first.");
  }

  return db;
}

module.exports = { connectDB, getDB };

