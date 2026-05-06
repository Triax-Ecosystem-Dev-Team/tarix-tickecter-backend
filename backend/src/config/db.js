// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient({
//   log: ['query', 'info', 'warn', 'error'],
// });

// module.exports = prisma;


const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Pass the adapter to the constructor
const prisma = new PrismaClient({ adapter });

module.exports = prisma;