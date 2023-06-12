import * as net from 'net'
import { InfluxDriver } from "../providers/influx"
import { InfluxConfig } from "../configs/influx"
import { Point } from '@influxdata/influxdb-client'

export default class StatusController {
  private influx: InfluxDriver

  constructor(public client: net.Socket, public redis: any) {
    const influx = new InfluxDriver(InfluxConfig)
    this.influx = influx
  }

  async store(status: string) {
    const imei = await this.getImei()
    if (imei === '') return this.logError('IMEI not found on redis')

    const statusTcpPoint = new Point('TCPStatus')
      .tag('imei', imei)
      .stringField('status', status)
      .stringField('IPAddress', this.client.remoteAddress)
      .stringField('port', this.client.remotePort)

    await this.influx.writePoint(statusTcpPoint)

    if (status === 'OFFLINE') {
      await this.redis.del(`imei/${this.client.remoteAddress}/${this.client.remotePort}`)
    }
  }

  async getImei() {
    const imei = await this.redis.get(`imei/${this.client.remoteAddress}/${this.client.remotePort}`)
    if (typeof (imei) === 'string') {
      return imei
    }
    return ''
  }

  logError(message: string) {
    console.log(new Date().toISOString() + ' ' + this.client.remoteAddress! + ' ' + message)
  }
}