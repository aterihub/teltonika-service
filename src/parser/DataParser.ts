import DataReader from "./DataReader";
import PacketDecoder from "./PacketDecoder";
import { DataType } from "./types/enum";
import crc from 'crc';
import { AVLData, IPacketResult } from "./types/type";

export default class DataParser {
  public decodeTcpData(bytes: Buffer) {
    let result: IPacketResult
    const parser = new DataReader(bytes)

    parser.readData(4, DataType.Preamble)
    parser.readData(4, DataType.AvlDataArrayLength)
    result = this.decodeAvlData(parser)
    parser.readData(4, DataType.Crc)

    // Check crc
    // const mainData = bytes.subarray(8, avlDataArrayLength.readInt32BE(0) + 8)
    // const resultCrcCalc = this.crcCalc(mainData)
    // if (crc.readUint32BE(0) !== resultCrcCalc) return console.log('Error crc')

    return result
  }

  public decodeAvlData(parser: DataReader): IPacketResult {
    const packetData: Array<AVLData> = []
    const codecIdData = parser.readData(1, DataType.CodecId)
    const countData = parser.readData(1, DataType.AvlDataCount)

    for (let a = 0; a < countData.readInt8(0); a++) {
      const packet = new PacketDecoder(parser, codecIdData)
      packetData.push(packet.result)
    }
    parser.readData(1, DataType.AvlDataCount)
    return { packet: packetData, countData }
  }

  private crcCalc(data: Buffer) {
    return crc.crc16(data)
  }
}