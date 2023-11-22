import { TCPServerFactory } from './src/server';

async function boostrap() {
  const tcpServer = new TCPServerFactory('0.0.0.0', 1337);
  tcpServer.listen();
}

boostrap();
