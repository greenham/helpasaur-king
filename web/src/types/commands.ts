export interface Command {
  _id: string
  command: string
  aliases: Array<string>
  response: string
  category: string
  enabled: boolean
}
