import * as net from 'net';
import { InfluxDriver } from '../providers/influx';
import { InfluxConfig } from '../configs/influx';
import { Point } from '@influxdata/influxdb-client';
import { ISocket } from '../parser/types/type';

export default class StatusController {
  private influx: InfluxDriver;

  constructor(
    public client: net.Socket,
    public sockets: ISocket[],
  ) {
    const influx = new InfluxDriver(InfluxConfig);
    this.influx = influx;
  }

  async store(status: string) {
    const imei = this.getImei();
    if (imei === '') return this.logError('IMEI not found on redis');

    const statusTcpPoint = new Point('TCPStatus')
      .tag('imei', imei)
      .stringField('status', status)
      .stringField('IPAddress', this.client.remoteAddress)
      .stringField('port', this.client.remotePort);

    await this.influx.writePoint(statusTcpPoint);
  }

  getImei() {
    return (
      this.sockets.find(({ client }) => client === this.client)?.imei || ''
    );
  }

  logError(message: string) {
    console.log(
      new Date().toISOString() +
        ' ' +
        this.client.remoteAddress! +
        ' ' +
        message,
    );
  }
}
