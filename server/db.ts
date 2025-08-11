import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in environment variables");
}

// Clean the database URL by removing any shell command artifacts
let databaseUrl = process.env.DATABASE_URL.trim();

// Remove 'psql ' prefix if present
if (databaseUrl.startsWith("psql '")) {
  databaseUrl = databaseUrl.substring(6);
}

// Remove trailing single quote if present
if (databaseUrl.endsWith("'")) {
  databaseUrl = databaseUrl.slice(0, -1);
}

console.log('Connecting to database...');
const sql = neon(databaseUrl);
export const db = drizzle(sql);