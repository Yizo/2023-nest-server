import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

const events = {
  ServerMessage: 'server:message',
  ClientMessage: 'client:message',
}

@WebSocketGateway(4000, {
  transports: ['websocket'],
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly logger: Logger) {}
  @WebSocketServer()
  server: Server

  afterInit(server: Server): void {
    this.logger.log('WebSocket server initialized', 'websocket')
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected ${client.id}`, 'websocket')
    this.logger.log(`Connected count: ${this.getConnectedCount()}`, 'websocket')
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected ${client.id}`, 'websocket')
    this.logger.log(`Connected count: ${this.getConnectedCount()}`, 'websocket')
  }

  @SubscribeMessage(events.ClientMessage)
  handleEvent(@MessageBody() data: { message: string; id: string }, @ConnectedSocket() client: Socket) {
    this.logger.log({ event: events.ClientMessage, data }, 'websocket')
    // client.emit(events.ServerMessage, `client.id: ${client.id}, message: ${data}`)
    return `client.id: ${client.id}, message: ${data.message}`
  }

  getConnectedCount(): number {
    return this.server.engine.clientsCount
  }
}
