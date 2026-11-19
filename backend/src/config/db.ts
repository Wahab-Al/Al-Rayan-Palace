// import mongoose from "mongoose";
// import dns from "node:dns";

// export default async function connectDB(uri: string) {
//   if (!uri) {
//     throw new Error("MONGO_URI not provided");
//   }

//   dns.setServers(["8.8.8.8"]);

//   await mongoose.connect(uri, {
//     family: 4,
//   });

//   console.log("MongoDB connected");
// }

import mongoose from 'mongoose';
import dns from 'node:dns';

export default async function connectDB(
  uri: string,
  maxPoolSize = 20,
  dnsServers: string[] = [],
): Promise<void> {
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }

  await mongoose.connect(uri, {
    maxPoolSize,
    serverSelectionTimeoutMS: 10_000,
  });

  console.log('MongoDB connected');
}
