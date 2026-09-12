import { Injectable } from "@nestjs/common";
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

/**
 * Rooms: `order:<orderId>` (customer tracking one order), `admin:orders`
 * (admin order-management screen), and `user:<userId>` (that user's personal
 * notification feed). No auth handshake for the demo — rooms are opaque ids,
 * nothing sensitive is broadcast beyond order status/eta and notification text.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: "*" }, namespace: "/realtime" })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(_client: Socket) {}

  @SubscribeMessage("order:subscribe")
  onSubscribeOrder(client: Socket, orderId: string) {
    client.join(`order:${orderId}`);
  }

  @SubscribeMessage("admin:subscribe")
  onSubscribeAdmin(client: Socket) {
    client.join("admin:orders");
  }

  @SubscribeMessage("user:subscribe")
  onSubscribeUser(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  @SubscribeMessage("admin:support:subscribe")
  onSubscribeAdminSupport(client: Socket) {
    client.join("admin:support");
  }

  emitOrderUpdate(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit("order:update", payload);
    this.server.to("admin:orders").emit("order:update", payload);
  }

  emitNewOrder(payload: unknown) {
    this.server.to("admin:orders").emit("order:new", payload);
  }

  emitNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit("notification:new", payload);
  }

  emitSupportMessage(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit("support:message", payload);
    this.server.to("admin:support").emit("support:message", payload);
  }
}
