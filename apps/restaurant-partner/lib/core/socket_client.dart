import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

class SocketClient {
  SocketClient._();
  static final SocketClient instance = SocketClient._();

  io.Socket? _socket;

  io.Socket get socket {
    // The server now requires a valid access token on every connection and
    // disconnects sockets that don't present one — see
    // apps/api/src/realtime/realtime.gateway.ts. The socket is only ever
    // touched from screens reachable after login, so the token is loaded by
    // the time this getter first runs.
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
