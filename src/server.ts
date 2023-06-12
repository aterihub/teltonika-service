import { createClient } from 'redis'
import * as net from 'net'
import { TCPClientWorker } from './workers/TCPWorker'
import { RedisConfig } from './configs/redis'
import StatusController from './controllers/StatusController'

export class TCPServerFactory {
  public sockets: Array<net.Socket> = []
  public server: net.Server
  public redis: any

  constructor(host: string, port: number) {
    const server = net.createServer()

    server.listen(port, host, () => {
      console.log(new Date().toISOString() + ' TCP Server is running on port ' + port + '.')
    })

    this.server = server
    this.redis = createClient({
      url: `redis://${RedisConfig.username}:${RedisConfig.password}@${RedisConfig.host}:6379`
    })

    this.redis.del()
  }

  async listen() {
    await this.redis.connect()

    this.server.on('connection', (sock) => {
      console.log(new Date().toISOString() + ' CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)

      this.sockets.push(sock)

      sock.on('data', (data: Buffer) => {
        const worker = new TCPClientWorker(data, sock, this.redis)
        worker.handleMessage()
      })

      sock.on('close', async () => {
        this.errorConnection(sock)
      })

      sock.on('error', (err) => {
        this.errorConnection(sock)
      })

    })
  }

  async errorConnection(sock: net.Socket){
    let index = this.sockets.findIndex((o: net.Socket) => {
      return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
    })
    if (index !== -1) this.sockets.splice(index, 1)
    console.log(new Date().toISOString() + ' CLOSED: ' + sock.remoteAddress + ':' + sock.remotePort)

    const statusController = new StatusController(sock, this.redis)
    statusController.store('OFFLINE')
  }
}


