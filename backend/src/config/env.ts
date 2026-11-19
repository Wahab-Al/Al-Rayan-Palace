import dotenv from 'dotenv';
import { isIP } from 'node:net';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    console.error(`Error: ${name} is missing`);
    process.exit(1);
  }

  return value;
}

const jwtExpireSeconds = Number.parseInt(process.env.JWT_EXPIRE_SECONDS ?? '7200', 10);
const mongoMaxPoolSize = Number.parseInt(process.env.MONGO_MAX_POOL_SIZE ?? '20', 10);
const mongoDnsServers = (process.env.MONGO_DNS_SERVERS ?? '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (!Number.isFinite(jwtExpireSeconds) || jwtExpireSeconds <= 0) {
  console.error('Error: JWT_EXPIRE_SECONDS must be a positive number');

  process.exit(1);
}

if (!Number.isFinite(mongoMaxPoolSize) || mongoMaxPoolSize < 1) {
  console.error('Error: MONGO_MAX_POOL_SIZE must be a positive number');
  process.exit(1);
}

if (mongoDnsServers.some((server) => isIP(server) === 0)) {
  console.error('Error: MONGO_DNS_SERVERS must be a comma-separated list of IP addresses');
  process.exit(1);
}

const config = {
  PORT: Number.parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  FRONTEND_ORIGIN: requireEnv('FRONTEND_ORIGIN'),

  MONGO_URI: requireEnv('MONGO_URI'),
  MONGO_MAX_POOL_SIZE: mongoMaxPoolSize,
  MONGO_DNS_SERVERS: mongoDnsServers,

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRE_SECONDS: jwtExpireSeconds,

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  ADMIN_USERNAME: requireEnv('ADMIN_USERNAME'),
  ADMIN_PASSWORD_HASH: requireEnv('ADMIN_PASSWORD_HASH'),
} as const;

export default config;
