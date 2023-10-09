import * as net from 'net'
import DataController from '../controllers/DataController'

export class TCPClientWorker {
  constructor(public data: Buffer, public client: net.Socket, public redis: any) { }

  handleMessage() {
    const dataController = new DataController(this.data, this.client, this.redis)
    dataController.store()
  }
}