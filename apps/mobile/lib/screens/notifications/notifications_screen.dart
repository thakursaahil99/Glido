import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../widgets/error_state.dart';

class GlidoNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  GlidoNotification({required this.id, required this.title, required this.body, required this.type, required this.isRead, required this.createdAt});

  factory GlidoNotification.fromJson(Map<String, dynamic> json) => GlidoNotification(
        id: json['id'],
        title: json['title'],
        body: json['body'],
        type: json['type'],
        isRead: json['isRead'],
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<GlidoNotification>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/notifications/me', query: {'pageSize': 30});
      setState(() => _items = (res['items'] as List<dynamic>).map((n) => GlidoNotification.fromJson(n)).toList());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiClient.instance.post('/notifications/me/read-all', {});
      _load();
    } catch (_) {
      // best-effort
    }
  }

  Future<void> _markRead(GlidoNotification n) async {
    if (n.isRead) return;
    try {
      await ApiClient.instance.patch('/notifications/me/${n.id}/read', {});
      _load();
    } catch (_) {
      // best-effort
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items?.any((n) => !n.isRead) ?? false;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (hasUnread) TextButton(onPressed: _markAllRead, child: const Text('Mark all read')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? ErrorStateView(message: _error!, onRetry: _load)
            : _items == null
                ? const Center(child: CircularProgressIndicator())
                : _items!.isEmpty
                    ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No notifications yet.')))])
                    : ListView.separated(
                        itemCount: _items!.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final n = _items![i];
                          return ListTile(
                            tileColor: n.isRead ? null : GlidoColors.primaryLight.withValues(alpha: 0.4),
                            onTap: () => _markRead(n),
                            leading: CircleAvatar(
                              backgroundColor: GlidoColors.primaryLight,
                              child: Icon(
                                n.type == 'ORDER' ? Icons.receipt_long : (n.type == 'PROMOTION' ? Icons.local_offer : Icons.notifications),
                                color: GlidoColors.primary,
                                size: 18,
                              ),
                            ),
                            title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                            subtitle: Text(n.body, style: const TextStyle(fontSize: 12.5)),
                            trailing: Text(_timeAgo(n.createdAt), style: TextStyle(fontSize: 10.5, color: GlidoColors.muted)),
                            isThreeLine: false,
                          );
                        },
                      ),
      ),
    );
  }
}
