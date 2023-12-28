import { DataType } from './types/enum';

export class ValueConverter {
  public static GetValue(arraySegment: Buffer, dataType: DataType): any {
    switch (dataType) {
      case DataType.CodecId:
        return arraySegment.readUint8(0).toString();
      case DataType.AvlDataCount:
        return arraySegment;
      case DataType.Timestamp:
        const unix = arraySegment.readBigUInt64BE(0);
        const dateUnix = new Date(Number(unix));
        console.log(new Date().toISOString(), arraySegment, unix, dateUnix);
        return dateUnix;
      case DataType.Priority:
        return arraySegment.readInt8(0);
      case DataType.Latitude:
      case DataType.Longitude:
        return arraySegment.readInt32BE(0) / 10000000;
      case DataType.Altitude:
      case DataType.Speed:
      case DataType.Angle:
        return arraySegment.readInt16BE(0);
      case DataType.Satellites:
        return arraySegment.readInt8(0);
      case DataType.EventIoId:
      case DataType.IoCount:
      case DataType.IoCount1B:

      case DataType.IoId1B:
      case DataType.IoValue1B:
      case DataType.IoCount2B:
      case DataType.IoId2B:
      case DataType.IoValue2B:
      case DataType.IoCount4B:
      case DataType.IoId4B:
      case DataType.IoValue4B:
      case DataType.IoCount8B:
      case DataType.IoId8B:
      case DataType.IoValue8B:
      // Tcp types
      case DataType.Preamble:
      case DataType.AvlDataArrayLength:
      case DataType.Crc:
      // Codec 8 Extended types
      case DataType.ExtendedIoCount1B:
      case DataType.ExtendedIoCount2B:
      case DataType.ExtendedIoCount4B:
      case DataType.ExtendedIoCount8B:
      case DataType.ExtendedIoCountXB:
      case DataType.ExtendedEventIoId:
      case DataType.ExtendedIoCount:
      case DataType.ExtendedIoId1B:
      case DataType.ExtendedIoId2B:
      case DataType.ExtendedIoId4B:
      case DataType.ExtendedIoId8B:
      case DataType.ExtendedIoIdXB:
      case DataType.ExtendedIoValueXB:
      case DataType.ExtendedElementLength:
      // Codec 16 types
      case DataType.EventIoIdCodec16:
      case DataType.OriginType:
      case DataType.IoId1BCodec16:
      case DataType.IoId2BCodec16:
      case DataType.IoId4BCodec16:
      case DataType.IoId8BCodec16:
      // Codec7 types
      case DataType.PriorityGh:
      case DataType.TimestampGh:
      case DataType.GlobalMask:
      case DataType.GpsElementMask:
      case DataType.LongitudeGh:
      case DataType.LatitudeGh:
      case DataType.AngleGh:
      case DataType.SpeedGh:
      // GpsIO elements for Codec7
      case DataType.CellIdAndLocalAreaGh:
      case DataType.SignalQualityGh:
      case DataType.OperatorCodeGh:
      // Udp types
      case DataType.Length:
      case DataType.PacketId:
      case DataType.PacketType:
      case DataType.AvlPacketId:
      case DataType.ImeiLength:
      case DataType.Imei:
      default:
        return arraySegment;
    }
  }
}
