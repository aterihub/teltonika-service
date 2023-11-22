import * as dotenv from 'dotenv';
dotenv.config();

export interface INatsConfig {
  username: string;
  password: string;
  server: string;
}

export const NatsConfig: INatsConfig = {
  username: process.env.NATS_USERNAME || '',
  password: process.env.NATS_PASSWORD || '',
  server: process.env.NATS_SERVER || '',
};
