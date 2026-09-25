import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/assigned_order.dart';
import '../../models/partner_profile.dart';
import '../../models/partner_stats.dart';
import '../../widgets/error_state.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  PartnerProfile? _profile;
  List<AssignedOrder>? _orders;
  PartnerStats? _stats;
  String? _error;
  bool _togglingOnline = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    SocketClient.instance.socket.on('order:update', _onUpdate);
    SocketClient.instance.socket.emit('admin:subscribe');
    // Polling fallback — the live serverless API doesn't hold a persistent socket connection,
    // so a newly-assigned order needs an active refresh loop instead of a push event.
    _poll = Timer.periodic(const Duration(seconds: 8), (_) => _load());
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('order:update', _onUpdate);
    _poll?.cancel();
    super.dispose();
  }

  void _onUpdate(dynamic _) => _load();

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final profileRes = await ApiClient.instance.get<Map<String, dynamic>>('/delivery-partner/me');
      final ordersRes = await ApiClient.instance.get<List<dynamic>>('/delivery-partner/me/orders');
      setState(() {
        _profile = PartnerProfile.fromJson(profileRes);
        _orders = ordersRes.map((o) => AssignedOrder.fromJson(o)).toList();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }

    // Stats are a nice-to-have overlay — fetched separately so a failure here
    // never blocks the profile/orders load above.
    try {
      final statsRes = await ApiClient.instance.get<Map<String, dynamic>>('/delivery-partner/me/stats');
      if (mounted) setState(() => _stats = PartnerStats.fromJson(statsRes));
    } catch (_) {
      // best-effort — stats section just stays hidden/loading
    }
  }

  Future<void> _toggleOnline(bool value) async {
    setState(() => _togglingOnline = true);
    try {
      final body = <String, dynamic>{'isOnline': value};
      if (value) {
        try {
          final permission = await Geolocator.checkPermission();
          if (permission == LocationPermission.denied) await Geolocator.requestPermission();
          final pos = await Geolocator.getCurrentPosition().timeout(const Duration(seconds: 6));
          body['currentLat'] = pos.latitude;
          body['currentLng'] = pos.longitude;
        } catch (_) {
          // location optional — partner can still go online without it
        }
      }
      await ApiClient.instance.patch('/delivery-partner/me', body);
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _togglingOnline = false);
    }
  }

  Future<void> _advanceStatus(AssignedOrder order) async {
    final nextStatus = order.status == 'READY' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
    try {
      await ApiClient.instance.patch('/delivery-partner/me/orders/${order.kind}/${order.id}/status', {'status': nextStatus});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Deliveries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
          ),
        ],
      ),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : _profile == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: _profile!.isOnline ? GlidoGradients.primaryButton(context.colors) : null,
                          color: _profile!.isOnline ? null : context.colors.surface,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: glidoCardShadow(),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _profile!.isOnline ? "You're online" : "You're offline",
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                      color: _profile!.isOnline ? Colors.white : context.colors.ink,
                                    ),
                                  ),
                                  Text(
                                    _profile!.isOnline ? 'Looking for deliveries nearby' : 'Go online to start receiving orders',
                                    style: TextStyle(fontSize: 12, color: _profile!.isOnline ? Colors.white70 : context.colors.muted),
                                  ),
                                ],
                              ),
                            ),
                            _togglingOnline
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                                : Switch(
                                    value: _profile!.isOnline,
                                    onChanged: _toggleOnline,
                                    activeThumbColor: Colors.white,
                                    activeTrackColor: Colors.white38,
                                  ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      _StatsSection(stats: _stats, activeOrders: _orders?.length),
                      const SizedBox(height: 20),
                      Text('Assigned deliveries', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 10),
                      if (_orders == null)
                        const Center(child: CircularProgressIndicator())
                      else if (_orders!.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('No deliveries assigned right now.', style: TextStyle(color: context.colors.muted))),
                        )
                      else
                        ..._orders!.map((o) => _OrderCard(order: o, onAdvance: () => _advanceStatus(o))),
                    ],
                  ),
                ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final AssignedOrder order;
  final VoidCallback onAdvance;
  const _OrderCard({required this.order, required this.onAdvance});

  @override
  Widget build(BuildContext context) {
    final isPickup = order.status == 'READY';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(18), boxShadow: glidoCardShadow()),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: context.colors.primaryLight, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  order.kind == 'food' ? 'FOOD' : 'GROCERY',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: context.colors.primaryDark),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text('#${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700))),
              Text('₹${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 8),
          _StatusChip(status: order.status),
          const SizedBox(height: 8),
          if (order.restaurantName != null) Text('Pickup: ${order.restaurantName}', style: TextStyle(fontSize: 12.5, color: context.colors.muted)),
          if (order.address != null) Text('Drop: ${order.address!.full}', style: TextStyle(fontSize: 12.5, color: context.colors.muted)),
          Text('${order.items.length} item(s) · ${order.paymentMethod} · ${order.paymentStatus}', style: TextStyle(fontSize: 11.5, color: context.colors.muted)),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onAdvance,
              icon: Icon(isPickup ? Icons.two_wheeler : Icons.check_circle_outline, size: 18),
              label: Text(isPickup ? 'Mark picked up' : 'Mark delivered'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small colored-dot + label status signal for an order card — READY (waiting
/// pickup) vs OUT_FOR_DELIVERY (in transit) vs anything else, using the
/// theme's semantic colors so it stays legible in both light and dark mode.
class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    late final Color dotColor;
    late final String label;
    switch (status) {
      case 'READY':
        dotColor = c.accent;
        label = 'Ready for pickup';
        break;
      case 'OUT_FOR_DELIVERY':
        dotColor = c.cab;
        label = 'Out for delivery';
        break;
      case 'DELIVERED':
        dotColor = c.success;
        label = 'Delivered';
        break;
      default:
        dotColor = c.muted;
        label = status;
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: dotColor)),
      ],
    );
  }
}

/// "Today" / "This week" earnings + delivery-count tiles, fed by the real
/// GET /delivery-partner/me/stats endpoint. Stays out of the way (compact
/// skeleton) while loading, and hides gracefully if the fetch failed —
/// the rest of the home screen doesn't depend on it.
class _StatsSection extends StatelessWidget {
  final PartnerStats? stats;
  final int? activeOrders;
  const _StatsSection({required this.stats, required this.activeOrders});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (stats == null) {
      return Container(
        height: 84,
        decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(18), boxShadow: glidoCardShadow()),
        alignment: Alignment.center,
        child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: c.muted)),
      );
    }
    final today = stats!.today;
    final week = stats!.last7Days;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: _StatTile(
            label: "Today's earnings",
            value: '₹${today.earnings.toStringAsFixed(0)}',
            sublabel: '${today.deliveries} ${today.deliveries == 1 ? 'delivery' : 'deliveries'}',
            emphasize: true,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatTile(
            label: 'This week',
            value: '₹${week.earnings.toStringAsFixed(0)}',
            sublabel: '${week.deliveries} ${week.deliveries == 1 ? 'delivery' : 'deliveries'}',
          ),
        ),
        if (activeOrders != null) ...[
          const SizedBox(width: 12),
          Expanded(
            child: _StatTile(
              label: 'Active now',
              value: '$activeOrders',
              sublabel: activeOrders == 1 ? 'delivery' : 'deliveries',
            ),
          ),
        ],
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final String sublabel;
  final bool emphasize;
  const _StatTile({required this.label, required this.value, required this.sublabel, this.emphasize = false});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: emphasize ? GlidoGradients.primaryButton(c) : null,
        color: emphasize ? null : c.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: glidoCardShadow(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: emphasize ? Colors.white70 : c.muted),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: emphasize ? Colors.white : c.ink),
          ),
          const SizedBox(height: 2),
          Text(
            sublabel,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: emphasize ? Colors.white70 : c.muted),
          ),
        ],
      ),
    );
  }
}
