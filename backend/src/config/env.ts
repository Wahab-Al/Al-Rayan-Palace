
import dotenv from 'dotenv';
import { isIP } from 'node:net';

dotenv.config();

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    return fail(`${name} is missing`);
  }

  return value;
}

function parsePositiveInteger(name: string, fallback: string): number {
  const rawValue = process.env[name] ?? fallback;

  // Accept positive integers only; reject values such as "7200abc".
  if (!/^[1-9]\d*$/.test(rawValue)) {
    return fail(`${name} must be a positive integer`);
  }

  const parsedValue = Number(rawValue);

  if (!Number.isSafeInteger(parsedValue)) {
    return fail(`${name} exceeds the safe integer range`);
  }

  return parsedValue;
}

const jwtSecret = requireEnv('JWT_SECRET');

// This project uses a 32-byte random secret encoded as 64 hex characters.
if (!/^[a-f0-9]{64}$/i.test(jwtSecret)) {
  fail(
    'JWT_SECRET must contain exactly 64 hexadecimal characters. ' +
      'Generate it with: openssl rand -hex 32',
  );
}

const jwtExpireSeconds = parsePositiveInteger('JWT_EXPIRE_SECONDS', '7200');
const mongoMaxPoolSize = parsePositiveInteger('MONGO_MAX_POOL_SIZE', '20');

const uploadMaxConcurrent = parsePositiveInteger(
  'UPLOAD_MAX_CONCURRENT',
  '1',
);

if (uploadMaxConcurrent > 4) {
  fail('UPLOAD_MAX_CONCURRENT must be between 1 and 4');
}

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS ?? '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers.some((server) => isIP(server) === 0)) {
  fail('MONGO_DNS_SERVERS must be a comma-separated list of IP addresses');
}

const config = {
  PORT: Number.parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  FRONTEND_ORIGIN: requireEnv('FRONTEND_ORIGIN'),

  MONGO_URI: requireEnv('MONGO_URI'),
  MONGO_MAX_POOL_SIZE: mongoMaxPoolSize,
  MONGO_DNS_SERVERS: mongoDnsServers,

  UPLOAD_MAX_CONCURRENT: uploadMaxConcurrent,

  JWT_SECRET: jwtSecret,
  JWT_EXPIRE_SECONDS: jwtExpireSeconds,
  JWT_ISSUER: requireEnv('JWT_ISSUER'),
  JWT_AUDIENCE: requireEnv('JWT_AUDIENCE'),

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  ADMIN_USERNAME: requireEnv('ADMIN_USERNAME'),
  ADMIN_PASSWORD_HASH: requireEnv('ADMIN_PASSWORD_HASH'),
} as const;

export default config;
