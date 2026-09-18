
export interface Participant {
  id: string;
  name: string;
}

export enum DrawStatus {
  IDLE = 'IDLE',
  DRAWING = 'DRAWING',
  FINISHED = 'FINISHED'
}

export interface DrawResult {
  winners: Participant[];
  timestamp: number;
}
