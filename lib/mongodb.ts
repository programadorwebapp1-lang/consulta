import mongoose from "mongoose";

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI não foi definida no .env.local");
}

const mongoUri: string = MONGODB_URI;

const cached: Cached = global.mongooseCache || { conn: null, promise: null };

global.mongooseCache = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, {
      dbName: "consultorio_medico",
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export const connectMongo = connectDB;

let cleanupCpfIndexPromise: Promise<void> | null = null;

export async function removeLegacyPatientCpfIndex() {
  if (!cleanupCpfIndexPromise) {
    cleanupCpfIndexPromise = (async () => {
      const { default: Patient } = await import("@/models/Patient");
      try {
        await Patient.collection.dropIndex("cpf_1");
      } catch {
        // Ignore when the index no longer exists.
      }
    })();
  }

  return cleanupCpfIndexPromise;
}
