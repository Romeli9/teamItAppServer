import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
}

const userRoom = (userId: string) => `user:${userId}`;

// Single gateway at default namespace. Clients connect with the JWT as
// `auth.token` (socket.io-client supports this natively). On connect we
// place the socket into `user:<userId>` so services can emit
// user-scoped events without tracking socket IDs.
@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (!token) throw new UnauthorizedException('Missing token');

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      await client.join(userRoom(payload.sub));
      this.logger.log(`socket ${client.id} joined ${userRoom(payload.sub)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'auth failed';
      this.logger.warn(`rejected socket ${client.id}: ${msg}`);
      client.emit('error', { message: 'unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`socket ${client.id} disconnected`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(userRoom(userId)).emit(event, payload);
  }
}
