import { InfluxConfig } from '../configs/influx';
import { InfluxDriver } from '../providers/influx';
import type * as net from 'net';
import axios from 'axios';
import { BackedConfig } from '../configs/server';
import StatusController from './StatusController';
import DataParser from '../parser/DataParser';
import crc from 'crc';
import { Point } from '@influxdata/influxdb-client';
import { type ISocket } from '../parser/types/type';

export default class DataController {
  private readonly influx: InfluxDriver;

  constructor(
    public data: Buffer,
    public client: net.Socket,
    public redis: any,
    public sockets: ISocket[],
  ) {
    const influx = new InfluxDriver(InfluxConfig);
    this.influx = influx;
  }

  async store() {
    // Check Preamble
    const preamble = this.data.subarray(0, 4);
    if (preamble.compare(Buffer.from([0x00, 0x00, 0x00, 0x00])) !== 0) {
      await this.imeiCheck();
      return;
    }

    // Get IMEI
    const imei = await this.getImei();
    if (imei === '') {
      this.logError('IMEI not found on redis');
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
    const result = parser.decodeTcpData(this.data);

    // Store to InfluxDB
    const points: Point[] = [];
    result.packet.forEach((data) => {
      const point = new Point('geolocation')
        .tag('imei', imei)
        .stringField('latitude', data.latitude)
        .stringField('longitude', data.longitude)
        .stringField('sat_quantity', data.satellites.toString())
        .stringField('course', data.angle.toString())
        .stringField('altitude', data.altitude.toString())
        .stringField('stored_time', new Date().toISOString())
        .stringField('event_io', data.eventId.toString())
        .stringField('io_count', data.ioCount.toString())
        .timestamp(data.timestamp);

      data.io.forEach((io) => {
        point.stringField(io.id.toString(), io.value);
      });
      points.push(point);
    });
    await this.influx.writePoints(points);

    // Send response to client
    const prefix = Buffer.from([0x00, 0x00, 0x00]);
    this.write(
      this.client,
      Buffer.concat([prefix, result.countData]),
      () => {},
    );
  }

  async getImei() {
    const imei = await this.redis.get(
      `imei/${this.client.remoteAddress}/${this.client.remotePort}`,
    );
    if (typeof imei === 'string') {
      return imei;
    }
    return '';
  }

  async imeiCheck(): Promise<void> {
    // Check imei length
    const imeiLength = this.data.subarray(0, 2).readInt16BE(0);
    if (imeiLength !== 15) return;

    // Check imei from tcp stream data
    const imei = this.data.subarray(2, this.data.length).toString();

    // Check if imei available on FMS-BE
    const responseCheckImei = await axios.get(
      `${BackedConfig.url}/api/v1/devices/${imei}`,
    );
    if (responseCheckImei.status !== 200) return;

    // Write accepted tcp stream to device Teltonika and store imei to redis
    this.write(this.client, Buffer.from([0x01]), async () => {
      await this.redis.set(
        `imei/${this.client.remoteAddress}/${this.client.remotePort}`,
        imei,
      );

      const statusController = new StatusController(this.client, this.redis);
      await statusController.store('ONLINE');

      this.logError(`${imei} accepted to connect server`);

      // Set imei to ISocket object
      const socket = this.sockets.find(({ client }) => client === this.client);
      socket!.imei = imei;
    });
  }

  write(client: net.Socket, data: Buffer, cb?: any) {
    if (!client.write(data, 'hex')) {
      client.once('drain', cb);
    } else {
      process.nextTick(cb);
    }
  }

  logError(message: string) {
    console.log(
      new Date().toISOString() +
        ' ' +
        this.client.remoteAddress! +
        ':' +
        this.client.remotePort! +
        ' ' +
        message,
    );
  }
}
