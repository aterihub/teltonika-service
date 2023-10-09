import DataReader from "./DataReader";
import { DataType } from "./types/enum";
import { AVLData, IOElement } from "./types/type";

export default class PacketDecoder {
  private readonly _parser: DataReader
  public result!: AVLData;
  
  constructor(parser: DataReader, codecId: string) {
    this._parser = parser;
    if (codecId == "7") this.parseAndDecodeCodec7Data();
    if (codecId == "8") this.parseAndDecodeCodec8Data();
    if (codecId == "16") this.parseAndDecodeCodec16Data();
    if (codecId == "142") this.parseAndDecodeCodec8EData();
  }

  private parseAndDecodeCodec7Data() { }
  private parseAndDecodeCodec8Data() { }
  private parseAndDecodeCodec16Data() { }
  private parseAndDecodeCodec8EData() {
    const ioElement: Array<IOElement> = []

    const timestamp = this._parser.readData(8, DataType.Timestamp)
    const priority = this._parser.readData(1, DataType.Priority)
    const longitude = this._parser.readData(4, DataType.Longitude)
    const latitude = this._parser.readData(4, DataType.Latitude)
    const altitude = this._parser.readData(2, DataType.Altitude)
    const angle = this._parser.readData(2, DataType.Angle)
    const satellites = this._parser.readData(1, DataType.Satellites)
    const speed = this._parser.readData(2, DataType.Speed)
    const extendedEventIoId = this._parser.readData(2, DataType.ExtendedEventIoId)
    const extendedIoCount = this._parser.readData(2, DataType.ExtendedIoCount)

    const ioCount1BData = this._parser.readData(2, DataType.ExtendedIoCount1B)
    for (let j = 0; j < ioCount1BData.readInt16BE(0); j++) {
      const id = this._parser.readData(2, DataType.ExtendedIoId1B)
      const value = this._parser.readData(1, DataType.IoValue1B)
      ioElement.push({ id: id.readInt16BE(0), value: value.toString('hex') })
    }

    const ioCount2BData = this._parser.readData(2, DataType.ExtendedIoCount2B)
    for (let j = 0; j < ioCount2BData.readInt16BE(0); j++) {
      const id = this._parser.readData(2, DataType.ExtendedIoId2B)
      const value = this._parser.readData(2, DataType.IoValue2B)
      ioElement.push({ id: id.readInt16BE(0), value: value.toString('hex') })
    }

    const ioCount4BData = this._parser.readData(2, DataType.ExtendedIoCount4B)
    for (let j = 0; j < ioCount4BData.readInt16BE(0); j++) {
      const id = this._parser.readData(2, DataType.ExtendedIoId4B)
      const value = this._parser.readData(4, DataType.IoValue4B)
      ioElement.push({ id: id.readInt16BE(0), value: value.toString('hex') })
    }

    const ioCount8BData = this._parser.readData(2, DataType.ExtendedIoCount8B)
    for (let j = 0; j < ioCount8BData.readInt16BE(0); j++) {
      const id = this._parser.readData(2, DataType.ExtendedIoId8B)
      const value = this._parser.readData(8, DataType.IoValue8B)
      ioElement.push({ id: id.readInt16BE(0), value: value.toString('hex') })
    }

    const ioCountXBData = this._parser.readData(2, DataType.ExtendedIoCountXB)
    for (let j = 0; j < ioCountXBData.readInt16BE(0); j++) {
      const id = this._parser.readData(2, DataType.ExtendedIoIdXB)
      const extendedElementLength = this._parser.readData(2, DataType.ExtendedElementLength);
      const value = this._parser.readData(extendedElementLength.readInt16BE(0), DataType.ExtendedIoValueXB)
      ioElement.push({ id: id.readInt16BE(0), value: value.toString('hex') })
    }

    this.result = {
      timestamp,
      priority,
      longitude,
      latitude,
      altitude,
      angle,
      satellites,
      speed,
      eventId: extendedEventIoId.readInt16BE(0),
      ioCount: extendedIoCount.readInt16BE(0),
      io: ioElement
    }
  }
}