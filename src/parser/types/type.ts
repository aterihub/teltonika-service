import * as net from 'net';

export type AVLData = {
  timestamp: Date;
  priority: number;
  longitude: string;
  latitude: string;
  altitude: number;
  angle: number;
  satellites: number;
  speed: number;
  eventId: number;
  ioCount: number;
  io: Array<IOElement>;
};

export type IOElement = {
  id: number | string;
  value: string | number;
};

export interface IPacketResult {
  packet: Array<AVLData>;
  countData: Buffer;
}

export interface ISocket {
  imei?: string;
  client: net.Socket;
}
