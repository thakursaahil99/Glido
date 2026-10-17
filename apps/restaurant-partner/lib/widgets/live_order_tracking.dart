import 'dart:async';
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/socket_client.dart';
import '../models/order_tracking.dart';
import 'tracking_map.dart';

const _trackable = {'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'};

bool isTrackableStatus(String status) => _trackable.contains(status);

/// Live map + ETA card for one food order — Socket.IO `order:location` pushes when the
/// socket is up, polling GET /orders/:id/tracking when it isn't (the serverless API
/// can't hold sockets). Mirrors apps/web/src/components/live-order-tracking.tsx.
class LiveOrderTracking extends StatefulWidget {
  final String orderId;
  final String status;
  final Color riderColor;
  final String userAgentPackageName;
  final bool forStaff;
  final double mapHeight;

  const LiveOrderTracking({
    super.key,
    required this.orderId,
    required this.status,
    required this.riderColor,
    required this.userAgentPackageName,
    this.forStaff = false,
    this.mapHeight = 260,
  });

  @override
  State<LiveOrderTracking> createState() => _LiveOrderTrackingState();
}

class _LiveOrderTrackingState extends State<LiveOrderTracking> {
  OrderTracking? _t;
  Timer? _tick;
  DateTime _lastFetch = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _refresh();
    final s = SocketClient.instance.socket;
    if (s.connected) _join();
    s.on('connect', _join);
    s.on('order:location', _onLocation);
    s.on('order:update', _onOrderUpdate);
    // One tick drives both the "updated Xs ago" label and the polling fallback.
    _tick = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final since = DateTime.now().difference(_lastFetch);
      final socketUp = SocketClient.instance.socket.connected;
      if (_t != null && !isTrackableStatus(_t!.status)) return;
      if (!socketUp || since > const Duration(seconds: 20)) {
        _refresh();
      } else {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    final s = SocketClient.instance.socket;
    s.off('connect', _join);
    s.off('order:location', _onLocation);
    s.off('order:update', _onOrderUpdate);
    _tick?.cancel();
    super.dispose();
  }

  // Rooms don't survive a reconnect, so re-join every time the socket comes back.
  void _join([dynamic _]) => SocketClient.instance.socket.emit('order:subscribe', widget.orderId);

  void _onLocation(dynamic e) {
    if (e is! Map || e['orderId'] != widget.orderId || !mounted) return;
    if (_t?.rider == null) {
      _refresh();
      return;
    }
    setState(() => _t = _t!.withRiderFix(e));
  }

  void _onOrderUpdate(dynamic p) {
    if (p is Map && p['orderId'] == widget.orderId) _refresh();
  }

  Future<void> _refresh() async {
    _lastFetch = DateTime.now();
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/orders/${widget.orderId}/tracking');
      if (mounted) setState(() => _t = OrderTracking.fromJson(res));
    } catch (_) {
      // Keep the last known position; the next tick retries.
    }
  }

  String _headline(OrderTracking t) {
    final eta = t.etaMinutes != null ? '${t.etaMinutes} min' : null;
    switch (t.status) {
      case 'OUT_FOR_DELIVERY':
        if (widget.forStaff) return eta != null ? 'Out for delivery · ~$eta to drop' : 'Out for delivery';
        return eta != null ? 'Arriving in ~$eta' : 'Your order is on the way';
      case 'READY':
        return t.rider != null ? '${t.rider!.name} is heading to the restaurant' : 'Ready — waiting for a delivery partner';
      case 'PREPARING':
        return 'Food is being prepared';
      case 'ACCEPTED':
        return 'Restaurant accepted the order';
      default:
        return 'Waiting for the restaurant to confirm';
    }
  }

  String _ago(DateTime? at) {
    if (at == null) return '—';
    final s = DateTime.now().difference(at).inSeconds;
    if (s < 10) return 'just now';
    if (s < 60) return '${s}s ago';
    final m = (s / 60).round();
    return m < 60 ? '$m min ago' : 'over an hour ago';
  }

  @override
  Widget build(BuildContext context) {
    if (!isTrackableStatus(widget.status)) return const SizedBox.shrink();
    final t = _t;
    if (t == null) {
      return Card(child: SizedBox(height: widget.mapHeight + 70, child: const Center(child: CircularProgressIndicator())));
    }
    if (t.restaurant == null && t.drop == null && t.rider?.position == null) {
      return const Card(
        child: ListTile(leading: Icon(Icons.map_outlined), title: Text('Live map will appear once a location is available for this order.')),
      );
    }

    final muted = Theme.of(context).textTheme.bodySmall?.color;
    final stale = t.rider?.lastLocationAt != null && DateTime.now().difference(t.rider!.lastLocationAt!) > const Duration(minutes: 2);
    final sub = [
      if (t.remainingKm != null) '${t.remainingKm} km to go',
      if (t.rider != null) t.rider!.position != null ? '${t.rider!.name} · updated ${_ago(t.rider!.lastLocationAt)}' : "${t.rider!.name} hasn't shared a location yet",
    ].join(' · ');

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_headline(t), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                      if (sub.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(sub, style: TextStyle(fontSize: 12, color: muted)),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: stale ? Colors.grey.withValues(alpha: 0.15) : widget.riderColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: stale ? Colors.grey : widget.riderColor, shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(stale ? 'Signal lost' : 'LIVE',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: stale ? Colors.grey : widget.riderColor)),
                  ]),
                ),
              ],
            ),
          ),
          TrackingMap(
            restaurant: t.restaurant,
            drop: t.drop,
            rider: t.rider?.position,
            riderHeading: t.rider?.heading,
            pickedUp: t.pickedUp,
            riderColor: widget.riderColor,
            userAgentPackageName: widget.userAgentPackageName,
            height: widget.mapHeight,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Wrap(spacing: 14, runSpacing: 4, children: [
              _Legend(color: const Color(0xFF1F2937), label: t.restaurantName),
              _Legend(color: const Color(0xFF0EA36C), label: t.dropLabel),
              if (t.rider != null) _Legend(color: widget.riderColor, label: 'Delivery partner'),
            ]),
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color)),
      ]);
}
