import { InfluxConfig } from "../configs/influx"
import { InfluxDriver } from "../providers/influx"
import * as net from 'net'
import axios from "axios"
import { BackedConfig } from "../configs/server"
import StatusController from "./StatusController"
import DataParser from "../parser/DataParser"
import crc from 'crc'
import { Point } from "@influxdata/influxdb-client"

export default class DataController {
  private influx: InfluxDriver

  constructor(public data: Buffer, public client: net.Socket, public redis: any) {
    const influx = new InfluxDriver(InfluxConfig)
    this.influx = influx
  }

  async store() {
    // Check Preamble
    const preamble = this.data.subarray(0, 4)
    if (preamble.compare(Buffer.from([0x00, 0x00, 0x00, 0x00])) !== 0) return this.imeiCheck()

    // Get IMEI
    const imei = await this.getImei()
    if (imei === '') return this.logError('IMEI not found on redis')

    // Check CRC
    const crcFromData = this.data.subarray(this.data.length - 4).readInt32BE(0)
    const dataFieldLength = this.data.subarray(4, 8).readInt32BE(0)
    const mainData = this.data.subarray(8, dataFieldLength + 8)
    const resultCrcCalc = crc.crc16(mainData)
    if (crcFromData !== resultCrcCalc) return this.logError('Crc not match')

    // Parse
    const parser = new DataParser
    const result = parser.decodeTcpData(this.data)

    // Store to InfluxDB
    let points: Array<Point> = []
    result.packet.forEach(data => {
      const point = new Point('geolocation')
        .tag('imei', imei)
        .stringField('latitude', data.latitude)
        .stringField('longitude', data.longitude)
        .stringField('sat_quantity', data.satellites.toString())
        .stringField('course', data.angle.toString())
        .stringField('altitude', data.altitude.toString())
        .stringField('stored_time', new Date().toISOString())
        .stringField('event_io', data.eventId.toString())
        .stringField('io_count', data.ioCount.toString())
        .timestamp(data.timestamp)
        
      data.io.forEach(io => {
        point.stringField(io.id.toString(), io.value)
      })
      points.push(point)
    })
    await this.influx.writePoints(points)

    // Send response to client
    const prefix = Buffer.from([0x00, 0x00, 0x00])
    this.client.write(Buffer.concat([prefix, result.countData]))
    return
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
      const responseCheckImei = await axios.get(`${BackedConfig.url}/api/v1/devices/${imei}`)
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