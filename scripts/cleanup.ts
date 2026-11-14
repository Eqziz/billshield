import "dotenv/config";
import { cleanup } from "../src/server/security";
import { db } from "../src/server/db";
await cleanup();
await db.$disconnect();
console.log("Expired guest workspaces and rate-limit buckets removed.");
