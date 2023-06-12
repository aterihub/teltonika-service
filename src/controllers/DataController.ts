import { Point } from "@influxdata/influxdb-client"
import { InfluxConfig } from "../configs/influx"
import { InfluxDriver } from "../providers/influx"
import * as net from 'net'
import axios from "axios"
import { BackedConfig } from "../configs/server"
import { Parser } from "../parser"
import StatusController from "./StatusController"

export default class DataController {
  private influx: InfluxDriver

  constructor(public data: Buffer, public client: net.Socket, public redis: any) {
    const influx = new InfluxDriver(InfluxConfig)
    this.influx = influx
  }

  async store() {
    // check preamble
    const preamble = this.data.subarray(0, 4)
    if (preamble.compare(Buffer.from([0x00, 0x00, 0x00, 0x00])) !== 0) return this.imeiCheck()

    // get imei
    const imei = await this.getImei()
    if (imei === '') return this.logError('IMEI not found on redis')

    const parser = new Parser(this.data, this.client)
    await parser.parse(imei)
    await this.influx.writePoints(parser.points)
  }

  logError(message: string) {
    console.log(new Date().toISOString() + ' ' + this.client.remoteAddress! + ' ' + message)
  }

  async getImei() {
    const imei = await this.redis.get(`imei/${this.client.remoteAddress}/${this.client.remotePort}`)
    if (typeof (imei) === 'string') {
      return imei
    }
    return ''
  }

  async imeiCheck(): Promise<void> {
    const imeiLength = this.data.subarray(0, 2).readInt16BE(0)

    if (imeiLength !== 15) return

    const imei = this.data.subarray(2, this.data.length).toString()

    try {
      const responseCheckImei = await axios.get(`${BackedConfig.url}/v1/api/devices/${imei}`)
      if (responseCheckImei.status !== 200) return

      this.client.write('01', 'hex')
      await this.redis.set(`imei/${this.client.remoteAddress}/${this.client.remotePort}`, imei)

      this.logError(`${imei} accepted to connect server`)

      const statusController = new StatusController(this.client, this.redis)
      statusController.store('ONLINE')
      return

    } catch (error: any) {
      console.error(error.message)
    }
  }
}