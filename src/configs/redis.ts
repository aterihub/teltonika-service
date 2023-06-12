import * as dotenv from 'dotenv'
dotenv.config()

export interface IRedisConfig {
  username: string,
  password: string,
  host: string
}

export const RedisConfig: IRedisConfig = {
  username: process.env.REDIS_USERNAME || '',
  password: process.env.REDIS_PASSWORD || '',
  host: process.env.REDIS_HOST || ''
}
