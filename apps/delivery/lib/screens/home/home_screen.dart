import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/assigned_order.dart';
import '../../models/partner_profile.dart';
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
  String? _error;
  bool _togglingOnline = false;

  @override
  void initState() {
    super.initState();
    _load();
    SocketClient.instance.socket.on('order:update', _onUpdate);
    SocketClient.instance.socket.emit('admin:subscribe');
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('order:update', _onUpdate);
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
                          gradient: _profile!.isOnline ? GlidoGradients.primaryButton : null,
                          color: _profile!.isOnline ? null : Colors.white,
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
                                      color: _profile!.isOnline ? Colors.white : GlidoColors.ink,
                                    ),
                                  ),
                                  Text(
                                    _profile!.isOnline ? 'Looking for deliveries nearby' : 'Go online to start receiving orders',
                                    style: TextStyle(fontSize: 12, color: _profile!.isOnline ? Colors.white70 : GlidoColors.muted),
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
                      Text('Assigned deliveries', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 10),
                      if (_orders == null)
                        const Center(child: CircularProgressIndicator())
                      else if (_orders!.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: Center(child: Text('No deliveries assigned right now.', style: TextStyle(color: GlidoColors.muted))),
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
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: glidoCardShadow()),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  order.kind == 'food' ? 'FOOD' : 'GROCERY',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: GlidoColors.primaryDark),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text('#${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700))),
              Text('₹${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 8),
          if (order.restaurantName != null) Text('Pickup: ${order.restaurantName}', style: TextStyle(fontSize: 12.5, color: GlidoColors.muted)),
          if (order.address != null) Text('Drop: ${order.address!.full}', style: TextStyle(fontSize: 12.5, color: GlidoColors.muted)),
          Text('${order.items.length} item(s) · ${order.paymentMethod} · ${order.paymentStatus}', style: TextStyle(fontSize: 11.5, color: GlidoColors.muted)),
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
