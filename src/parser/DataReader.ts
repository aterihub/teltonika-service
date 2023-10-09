import { ValueConverter } from "./ValueConverter"
import { DataType } from "./types/enum"

export default class DataReader {
  private data: Buffer
  private _offset: number

  constructor(_data: Buffer) {
    this.data = _data
    this._offset = 0
  }

  public readData(size: number, dataType: DataType) {
    const arraySegment = this.data.subarray(this._offset, this._offset + size)
    this._offset += size

    return ValueConverter.GetValue(arraySegment, dataType)
  }
}