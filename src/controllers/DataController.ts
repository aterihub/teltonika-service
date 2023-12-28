import type * as net from 'net';
import axios from 'axios';
import { BackedConfig } from '../configs/server';
import StatusController from './StatusController';
import DataParser from '../parser/DataParser';
import crc from 'crc';
import { type ISocket } from '../parser/types/type';
import { NatsConnection, StringCodec } from 'nats';
import { propertyIOMaping } from '../parser/types/iomap';

export default class DataController {
  constructor(
    public data: Buffer,
    public client: net.Socket,
    public sockets: ISocket[],
    public nats: NatsConnection,
  ) {}

  async store() {
    // Check Preamble
    const preamble = this.data.subarray(0, 4);
    if (preamble.compare(Buffer.from([0x00, 0x00, 0x00, 0x00])) !== 0) {
      await this.imeiCheck();
      return;
    }

    // Get IMEI
    const imei = this.getImei();
    if (imei === '') {
      this.logError('IMEI not found on buffer');
      return;
    }

    // Check CRC
    const crcFromData = this.data.subarray(this.data.length - 4).readInt32BE(0);
    const dataFieldLength = this.data.subarray(4, 8).readInt32BE(0);
    const mainData = this.data.subarray(8, dataFieldLength + 8);
    const resultCrcCalc = crc.crc16(mainData);
    if (crcFromData !== resultCrcCalc) {
      this.logError('Crc not match');
      return;
    }

    // Parse
    const parser = new DataParser();
    const points: Array<any> = [];
    try {
      const result = parser.decodeTcpData(this.data);
      console.log(result);
      result.packet.forEach((data) => {
        const point = {
          latitude: data.latitude,
          longitude: data.longitude,
          satellites: data.satellites,
          course: data.angle,
          altitude: data.altitude,
          storedTime: new Date().toISOString(),
          eventIo:
            propertyIOMaping[data.eventId.toString()] ||
            data.eventId.toString(),
          ioCount: data.ioCount,
          timestamp: data.timestamp,
        };
        data.io.forEach(({ id, value }) => {
          Object.assign(point, { [id.toString()]: value });
        });
        points.push(point);
      });

      // Send response to client
      const prefix = Buffer.from([0x00, 0x00, 0x00]);
      this.write(this.client, Buffer.concat([prefix, result.countData]), () => {
        // Should be send to NATS
        for (const iterator of points) {
          const sc = StringCodec();
          const measurement = 'geolocation';
          this.nats.publish(
            `device.${imei}.${measurement}`,
            sc.encode(JSON.stringify(iterator)),
          );
        }
      });
    } catch (error: any) {
      if (error.code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
        this.logError(
          'Caught ERR_BUFFER_OUT_OF_BOUNDS error:',
          this.data.toString('hex'),
        );
      } else {
        this.logError('An unexpected error occurred:', error.message);
      }
    }
  }

  getImei() {
    return (
      this.sockets.find(({ client }) => client === this.client)?.imei || ''
    );
  }

  async imeiCheck() {
    // Check imei length
    const imeiLength = this.data.subarray(0, 2).readInt16BE(0);
    if (imeiLength !== 15) return;

    // Check imei from tcp stream data
    const imei = this.data.subarray(2, this.data.length).toString();

    // Check if imei available on FMS-BE
    try {
      const responseCheckImei = await axios.get(
        `${BackedConfig.url}/service-connector/devices/${imei}`,
      );
      if (responseCheckImei.status !== 200) return;

      // Write accepted tcp stream to device Teltonika and store imei to buffer
      this.write(this.client, Buffer.from([0x01]), async () => {
        // Set imei to ISocket object
        const socket = this.sockets.find(
          ({ client }) => client === this.client,
        );
        socket!.imei = imei;

        this.logError('Accepted to connect server');

        // Send status device via nats
        const statusController = new StatusController(
          this.client,
          this.sockets,
          this.nats,
        );
        statusController.store('ONLINE');
      });
    } catch (error: any) {
      this.logError(error.message);
    }
  }

  write(client: net.Socket, data: Buffer, cb?: any) {
    if (!client.write(data, 'hex')) {
      client.once('drain', cb);
      this.logError('Failed to write response');
    } else {
      process.nextTick(cb);
    }
  }

  logError(...message: string[]) {
    console.log(
      new Date().toISOString() +
        ' ' +
        this.client.remoteAddress +
        ':' +
        this.client.remotePort +
        ' ' +
        this.getImei() +
        ' ' +
        message,
    );
  }
}
