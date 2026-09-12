import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../state/auth_state.dart';
import '../../widgets/error_state.dart';
import '../auth/login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  PartnerRestaurant? _restaurant;
  String? _error;
  bool _saving = false;
  bool _togglingOpen = false;

  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _cuisineCtrl = TextEditingController();
  final _deliveryTimeCtrl = TextEditingController();
  final _minOrderCtrl = TextEditingController();
  final _deliveryFeeCtrl = TextEditingController();
  final _packagingFeeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/partner/restaurant');
      final r = PartnerRestaurant.fromJson(res);
      setState(() {
        _restaurant = r;
        _nameCtrl.text = r.name;
        _descCtrl.text = r.description ?? '';
        _cuisineCtrl.text = r.cuisineTags ?? '';
        _deliveryTimeCtrl.text = r.avgDeliveryTimeMin.toString();
        _minOrderCtrl.text = r.minOrderAmount.toStringAsFixed(0);
        _deliveryFeeCtrl.text = r.deliveryFee.toStringAsFixed(0);
        _packagingFeeCtrl.text = r.packagingFee.toStringAsFixed(0);
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _toggleOpen() async {
    if (_restaurant == null) return;
    setState(() => _togglingOpen = true);
    try {
      await ApiClient.instance.patch('/partner/restaurant', {'isOpen': !_restaurant!.isOpen});
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_restaurant!.isOpen ? "You're open for orders" : "You're now closed")));
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _togglingOpen = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      await ApiClient.instance.patch('/partner/restaurant', {
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'cuisineTags': _cuisineCtrl.text.trim(),
        'avgDeliveryTimeMin': int.tryParse(_deliveryTimeCtrl.text) ?? 30,
        'minOrderAmount': double.tryParse(_minOrderCtrl.text) ?? 0,
        'deliveryFee': double.tryParse(_deliveryFeeCtrl.text) ?? 0,
        'packagingFee': double.tryParse(_packagingFeeCtrl.text) ?? 0,
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile saved')));
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your restaurant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await context.read<AuthState>().logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
              }
            },
          ),
        ],
      ),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : _restaurant == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: _restaurant!.isOpen ? GlidoGradients.primaryButton : null,
                          color: _restaurant!.isOpen ? null : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: glidoCardShadow(),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_restaurant!.name, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: _restaurant!.isOpen ? Colors.white : GlidoColors.ink)),
                                  Text(
                                    _restaurant!.isOpen ? 'Open for orders' : 'Closed',
                                    style: TextStyle(fontSize: 12, color: _restaurant!.isOpen ? Colors.white70 : GlidoColors.muted),
                                  ),
                                ],
                              ),
                            ),
                            _togglingOpen
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                                : Switch(
                                    value: _restaurant!.isOpen,
                                    onChanged: (_) => _toggleOpen(),
                                    activeThumbColor: Colors.white,
                                    activeTrackColor: Colors.white38,
                                  ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(8)),
                              child: Text(_restaurant!.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: GlidoColors.primaryDark)),
                            ),
                            const SizedBox(width: 8),
                            Text('★ ${_restaurant!.ratingAvg.toStringAsFixed(1)} (${_restaurant!.ratingCount})', style: TextStyle(color: GlidoColors.muted, fontSize: 12.5)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text('Restaurant profile', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 10),
                      TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
                      const SizedBox(height: 10),
                      TextField(controller: _descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Description')),
                      const SizedBox(height: 10),
                      TextField(controller: _cuisineCtrl, decoration: const InputDecoration(labelText: 'Cuisine tags (comma separated)')),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: TextField(controller: _deliveryTimeCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Delivery time (min)'))),
                          const SizedBox(width: 10),
                          Expanded(child: TextField(controller: _minOrderCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Min order (₹)'))),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: TextField(controller: _deliveryFeeCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Delivery fee (₹)'))),
                          const SizedBox(width: 10),
                          Expanded(child: TextField(controller: _packagingFeeCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Packaging fee (₹)'))),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _saving ? null : _saveProfile, child: Text(_saving ? 'Saving...' : 'Save profile')),
                    ],
                  ),
                ),
    );
  }
}
