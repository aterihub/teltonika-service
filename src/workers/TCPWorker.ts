import * as net from 'net'
import DataController from '../controllers/DataController'
import { ISocket } from '../parser/types/type'

export class TCPClientWorker {
  constructor(public data: Buffer, public client: net.Socket, public redis: any, public sockets: Array<ISocket>) { }

  handleMessage() {
    const dataController = new DataController(
      this.data,
      this.client,
      this.redis,
      this.sockets
    )
    dataController.store()
  }
}