import { createClient } from 'redis'
import * as net from 'net'
import { TCPClientWorker } from './workers/TCPWorker'
import { RedisConfig } from './configs/redis'
import StatusController from './controllers/StatusController'
import { ISocket } from './parser/types/type'

export class TCPServerFactory {
  public sockets: Array<ISocket> = []
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
      // Set keep alive TCP client
      sock.setKeepAlive(true, 25000)

      // If there's new connection came up will print logs
      console.log(new Date().toISOString() + ' CONNECTED ' + sock.remoteAddress + ':' + sock.remotePort)

      this.sockets.push({ client: sock })

      sock.on('data', (data: Buffer) => {
        const worker = new TCPClientWorker(data, sock, this.redis, this.sockets)
        worker.handleMessage()

        // Forward data for logging
        clientForwarder.write(sock.remoteAddress! + ' - ' + data.toString('hex'));
      })

      // Handle connection if device close connection
      sock.on('close', async () => {
        this.errorConnection(sock, 'CLOSED')
      })

      // Create error log when device connection error
      sock.on('error', async (error) => {
        console.log(new Date().toISOString() + ` ERROR ${error.message} ` + sock.remoteAddress + ':' + sock.remotePort)
      })
    })

    this.serverForwarder.on('connection', (sock) => {
      // Set keep alive TCP client
      sock.setKeepAlive(true, 25000)

      console.log(new Date().toISOString() + ' CLIENT LOGGER CONNECTED ' + sock.remoteAddress + ':' + sock.remotePort)

      this.socketForwaders.push(sock)

      sock.on('data', (data: Buffer) => {
        // check preample for separate message from client or device
        const preamble = data.subarray(0, 3)
        if (preamble.compare(Buffer.from([0x01, 0x02, 0x03])) !== 0) {
          // Send messages to all clients forwarder
          return this.socketForwaders.map(x => x.write(data))
        }

        // Send command to selected imei
        const imei = data.subarray(3, 18).toString()
        const socket = this.sockets.find((x) => (
          x.imei === imei
        ))
        if (socket === undefined) return sock.write('There\'s no device with imei' + imei)

        const length = data.subarray(18, 19).readUint8()
        const command = data.subarray(19, length + 19)
        if (!socket?.client.write(command)) return sock.write('There\'s error when write command to' + imei)
        return sock.write('Command sent succesfully to imei' + imei)
      })

      sock.on('close', async () => {
        console.log(new Date().toISOString() + ' CLIENT LOGGER CLOSE ' + sock.remoteAddress + ':' + sock.remotePort)
      })

      sock.on('error', async (error) => {
        console.log(new Date().toISOString() + ` CLIENT LOGGER ERROR ${error.message} ` + sock.remoteAddress + ':' + sock.remotePort)
      })
    })
  }

  async errorConnection(sock: net.Socket, message: string) {
    let index = this.sockets.findIndex(({ client }) => {
      return client.remoteAddress === sock.remoteAddress && client.remotePort === sock.remotePort;
    })
    if (index !== -1) this.sockets.splice(index, 1)
    console.log(new Date().toISOString() + ` ${message} ` + sock.remoteAddress + ':' + sock.remotePort)

    const statusController = new StatusController(sock, this.redis)
    statusController.store('OFFLINE')
  }
}


