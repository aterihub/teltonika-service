import { createClient } from 'redis'
import * as net from 'net'
import { TCPClientWorker } from './workers/TCPWorker'
import { RedisConfig } from './configs/redis'
import StatusController from './controllers/StatusController'

export class TCPServerFactory {
  public sockets: Array<net.Socket> = []
  public socketForwaders: Array<net.Socket> = []
  public server: net.Server
  public serverForwarder: net.Server
  public redis: any

  constructor(host: string, port: number) {
    const server = net.createServer()
    const serverForwarder = net.createServer()

    serverForwarder.listen(9200, host, () => {
      console.log(new Date().toISOString() + ' TCP Server Forwarder is running on port ' + 9200 + '.')
    })

    server.listen(port, host, () => {
      console.log(new Date().toISOString() + ' TCP Server is running on port ' + port + '.')
    })

    this.server = server
    this.serverForwarder = serverForwarder
    this.redis = createClient({
      url: `redis://${RedisConfig.username}:${RedisConfig.password}@${RedisConfig.host}:6379`
    })
  }

  async listen() {
    await this.redis.connect()

    const clientForwarder = new net.Socket()
    clientForwarder.connect(9200, '0.0.0.0', function () {
      console.log('Client forwarder active');
    });

    this.server.on('connection', (sock) => {
      sock.setKeepAlive(true,25000)

      console.log(new Date().toISOString() + ' CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)

      this.sockets.push(sock)

      sock.on('data', (data: Buffer) => {
        const worker = new TCPClientWorker(data, sock, this.redis)
        worker.handleMessage()

        // Forward data for logging
        clientForwarder.write(sock.remoteAddress! + ' - ' + data.toString('hex'));
      })

      sock.on('close', async () => {
        this.errorConnection(sock)
      })

      sock.on('error', () => {
        this.errorConnection(sock)
      })

    })

    this.serverForwarder.on('connection', (sock) => {
      console.log(new Date().toISOString() + ' CLIENT LOGGER CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)

      this.socketForwaders.push(sock)

      sock.on('data', (data: Buffer) => {
        // Send messages to all clients forwarder
        this.socketForwaders.map(x => x.write(data))
      })

      sock.on('close', async () => {
        console.log(new Date().toISOString() + ' CLIENT LOGGER ERROR: ' + sock.remoteAddress + ':' + sock.remotePort)
      })

      sock.on('error', (err) => {
        console.log(new Date().toISOString() + ' CLIENT LOGGER ERROR: ' + sock.remoteAddress + ':' + sock.remotePort)
      })
    })
  }

  async errorConnection(sock: net.Socket) {
    let index = this.sockets.findIndex((o: net.Socket) => {
      return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort;
    })
    if (index !== -1) this.sockets.splice(index, 1)
    console.log(new Date().toISOString() + ' CLOSED: ' + sock.remoteAddress + ':' + sock.remotePort)

    const statusController = new StatusController(sock, this.redis)
    statusController.store('OFFLINE')
  }
}


