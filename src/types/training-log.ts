export interface TrainingLogData {
  index: string
  name: string
  metric: string
  estimate: number
  target: number
  error: number
  abs_error: number
  rel_abs_error: number
  validation: boolean
  epoch: number
}