import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/location_tracker.dart';
import '../../core/theme.dart';
import '../../models/assigned_order.dart';
import '../../models/order_tracking.dart';
import '../../widgets/error_state.dart';
import '../../widgets/tracking_map.dart';

/// Full-screen map for one food delivery: the rider's own live position (straight
/// from the device GPS, not round-tripped through the server), the restaurant and
/// the customer, plus a hand-off to the phone's navigation app for turn-by-turn.
class DeliveryMapScreen extends StatefulWidget {
  final AssignedOrder order;
  const DeliveryMapScreen({super.key, required this.order});

  @override
  State<DeliveryMapScreen> createState() => _DeliveryMapScreenState();
}

class _DeliveryMapScreenState extends State<DeliveryMapScreen> {
  OrderTracking? _t;
  String? _error;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    LocationTracker.instance.addListener(_onTracker);
    // Status changes (e.g. the restaurant marking it READY) arrive via this poll.
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    LocationTracker.instance.removeListener(_onTracker);
    _poll?.cancel();
    super.dispose();
  }

  void _onTracker() {
    if (mounted) setState(() {});
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/orders/${widget.order.id}/tracking');
      if (!mounted) return;
      setState(() {
        _t = OrderTracking.fromJson(res);
        _error = null;
      });
    } on ApiException catch (e) {
      if (mounted && _t == null) setState(() => _error = e.message);
    }
  }

  Future<void> _navigateTo(LatLng to) async {
    // Google's universal directions URL opens the Maps app when installed and the
    // browser otherwise; two-wheeler mode where the region supports it.
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}&travelmode=two-wheeler');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No maps app available to navigate.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tracker = LocationTracker.instance;
    final t = _t;

    return Scaffold(
      appBar: AppBar(title: Text('#${widget.order.orderNumber}')),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : t == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    Expanded(
                      child: TrackingMap(
                        restaurant: t.restaurant,
                        drop: t.drop,
                        // Own GPS first (instant); the server's last fix if tracking is off.
                        rider: tracker.position ?? t.rider?.position,
                        riderHeading: tracker.heading ?? t.rider?.heading,
                        pickedUp: t.pickedUp,
                        riderColor: c.food,
                        userAgentPackageName: 'app.glido.delivery',
                        height: double.infinity,
                      ),
                    ),
                    _BottomPanel(
                      tracking: t,
                      sharing: tracker.isActive,
                      trackerError: tracker.error,
                      onNavigate: _navigateTo,
                    ),
                  ],
                ),
    );
  }
}

class _BottomPanel extends StatelessWidget {
  final OrderTracking tracking;
  final bool sharing;
  final String? trackerError;
  final void Function(LatLng) onNavigate;
  const _BottomPanel({required this.tracking, required this.sharing, required this.trackerError, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = tracking;
    final toCustomer = t.pickedUp;
    final target = toCustomer ? t.drop : t.restaurant;
    final targetLabel = toCustomer ? '${t.dropLabel} · ${t.dropLine1}' : t.restaurantName;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      decoration: BoxDecoration(color: c.surface, boxShadow: glidoCardShadow()),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(toCustomer ? 'Deliver to' : 'Pick up from', style: TextStyle(fontSize: 12, color: c.muted, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(targetLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16), maxLines: 2, overflow: TextOverflow.ellipsis),
            if (t.etaMinutes != null || t.remainingKm != null) ...[
              const SizedBox(height: 4),
              Text(
                [if (t.remainingKm != null) '${t.remainingKm} km', if (t.etaMinutes != null) '~${t.etaMinutes} min to customer'].join(' · '),
                style: TextStyle(fontSize: 12.5, color: c.muted),
              ),
            ],
            const SizedBox(height: 10),
            Row(children: [
              Icon(sharing ? Icons.wifi_tethering : Icons.location_off_outlined, size: 16, color: sharing ? c.success : c.danger),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  sharing ? 'Sharing live location with the customer' : (trackerError ?? 'Go online to share your live location'),
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: sharing ? c.success : c.danger),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: target == null ? null : () => onNavigate(target),
                icon: const Icon(Icons.navigation_outlined, size: 18),
                label: Text(toCustomer ? 'Navigate to customer' : 'Navigate to restaurant'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
