import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_client.dart';

class SocketClient {
  SocketClient._();
  static final SocketClient instance = SocketClient._();

  io.Socket? _socket;

  io.Socket get socket {
    _socket ??= io.io(
      '$kApiOrigin/realtime',
      io.OptionBuilder().setTransports(['websocket']).build(),
    );
    return _socket!;
  }
}
