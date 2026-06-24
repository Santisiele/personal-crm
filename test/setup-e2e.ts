import { config } from 'dotenv';

// e2e boots the real AppModule, which connects PrismaService to the database
// from DATABASE_URL. Jest does not load .env on its own, so do it here.
// `quiet` keeps dotenv from printing its banner to stdout.
config({ quiet: true });
