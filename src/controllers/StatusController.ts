import * as net from 'net';
import { ISocket } from '../parser/types/type';
import { NatsConnection, StringCodec } from 'nats';

export default class StatusController {
  constructor(
    public client: net.Socket,
    public sockets: ISocket[],
    public nats: NatsConnection,
  ) {}

  async store(status: string) {
    const imei = this.getImei();
    if (imei === '') return this.logError('IMEI not found on buffer');

    const dataStatus = {
      status,
      ipaddress: this.client.remoteAddress,
      port: this.client.remotePort,
    };

    const sc = StringCodec();
    this.nats.publish(
      `device.${imei}.geolocation`,
      sc.encode(JSON.stringify(dataStatus)),
    );
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
