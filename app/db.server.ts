import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });
  //log: ["query", "info", "warn", "error"],
  
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

console.log("process.env.NODE_ENV: ", process.env.NODE_ENV);

export { db };