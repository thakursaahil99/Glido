import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

/// Mirrors apps/web/src/lib/socket.ts — one shared connection to the
/// `/realtime` namespace for order/ride/notification updates.
class SocketClient {
  SocketClient._();
  static final SocketClient instance = SocketClient._();

  io.Socket? _socket;

  io.Socket get socket {
    // The server now requires a valid access token on every connection (see
    // apps/api/src/realtime/realtime.gateway.ts) and disconnects sockets that
    // don't present one. Every screen that touches the socket is only reachable
    // after login (HomeShell only mounts once AuthState resolves a user), so the
    // token is always loaded by the time this getter first runs.
    _socket ??= io.io(
      '$kApiOrigin/realtime',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': ApiClient.instance.accessToken})
          .build(),
    );
    return _socket!;
  }
}
