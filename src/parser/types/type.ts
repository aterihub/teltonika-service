export type AVLData = {
  timestamp: Date
  priority: number
  longitude: string
  latitude: string
  altitude: number
  angle: number
  satellites: number
  speed: number
  eventId: number
  ioCount: number
  io: Array<IOElement>
}

export type IOElement = {
  id: number
  value: string
}

export interface IPacketResult {
  packet: Array<AVLData>,
  countData: Buffer
}
