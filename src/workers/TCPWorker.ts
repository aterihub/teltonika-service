import * as net from 'net';
import DataController from '../controllers/DataController';
import { ISocket } from '../parser/types/type';
import { NatsConnection } from 'nats';

export class TCPClientWorker {
  constructor(
    public data: Buffer,
    public client: net.Socket,
    public sockets: Array<ISocket>,
    public nats: NatsConnection,
  ) {}

  handleMessage() {
    const dataController = new DataController(
      this.data,
      this.client,
      this.sockets,
      this.nats,
    );
    dataController.store();
  }
}
