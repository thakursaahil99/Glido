import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../state/auth_state.dart';
import 'notifications_screen.dart';

/// Bell icon with an unread-count badge — mirrors apps/web/src/components/notification-bell.tsx.
/// Fetches the count once, then stays live via the `notification:new` socket event.
class NotificationBellButton extends StatefulWidget {
  final Color? color;
  const NotificationBellButton({super.key, this.color});

  @override
  State<NotificationBellButton> createState() => _NotificationBellButtonState();
}

class _NotificationBellButtonState extends State<NotificationBellButton> {
  int _unread = 0;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _loadUnread();
    final userId = context.read<AuthState>().user?.id;
    final socket = SocketClient.instance.socket;
    if (userId != null) socket.emit('user:subscribe', userId);
    socket.on('notification:new', _onNotification);
    // Polling fallback — the live serverless API doesn't hold a persistent socket connection.
    _poll = Timer.periodic(const Duration(seconds: 20), (_) => _loadUnread());
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('notification:new', _onNotification);
    _poll?.cancel();
    super.dispose();
  }

  void _onNotification(dynamic _) => _loadUnread();

  Future<void> _loadUnread() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/notifications/me/unread-count');
      if (mounted) setState(() => _unread = res['count'] as int);
    } catch (_) {
      // best-effort
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: Icon(Icons.notifications_outlined, color: widget.color),
          onPressed: () async {
            await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            _loadUnread();
          },
        ),
        if (_unread > 0)
          Positioned(
            top: 6,
            right: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(10)),
              constraints: const BoxConstraints(minWidth: 16),
              child: Text(
                _unread > 9 ? '9+' : '$_unread',
                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
