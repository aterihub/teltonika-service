import * as dotenv from 'dotenv'
dotenv.config()

export interface IInfluxConfig {
  url: string,
  token: string,
  orgId: string,
  bucket: string
}

export const InfluxConfig: IInfluxConfig = {
  url: process.env.INFLUX_URL || '',
  token: process.env.INFLUX_TOKEN || '',
  bucket: process.env.INFLUX_BUCKET || '',
  orgId: process.env.INFLUX_ORG || ''
}
