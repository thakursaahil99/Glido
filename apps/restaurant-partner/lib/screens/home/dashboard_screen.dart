import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../models/restaurant_stats.dart';
import '../../state/auth_state.dart';
import '../../state/theme_state.dart';
import '../../widgets/error_state.dart';
import '../auth/login_screen.dart';

class DashboardScreen extends StatefulWidget {
  /// Optional hook so the bottom-nav shell can jump the user to the Orders
  /// tab when they tap the active-orders stat. Kept optional so this screen
  /// still works standalone (e.g. in tests) without a shell wired up.
  final VoidCallback? onViewOrders;

  const DashboardScreen({super.key, this.onViewOrders});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  PartnerRestaurant? _restaurant;
  String? _error;
  bool _saving = false;
  bool _togglingOpen = false;

  RestaurantStats? _stats;
  bool _statsLoading = true;
  String? _statsError;

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
    _loadStats();
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

  // Stats are fetched separately from the restaurant profile so a stats
  // failure never blocks the settings form from loading/working.
  Future<void> _loadStats() async {
    setState(() {
      _statsLoading = true;
      _statsError = null;
    });
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/partner/restaurant/stats');
      final s = RestaurantStats.fromJson(res);
      if (mounted) setState(() => _stats = s);
    } on ApiException catch (e) {
      if (mounted) setState(() => _statsError = e.message);
    } finally {
      if (mounted) setState(() => _statsLoading = false);
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
            tooltip: context.watch<ThemeState>().isDark ? 'Switch to light mode' : 'Switch to dark mode',
            icon: Icon(context.watch<ThemeState>().isDark ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined),
            onPressed: () => context.read<ThemeState>().toggle(),
          ),
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
                  onRefresh: () => Future.wait([_load(), _loadStats()]),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: _restaurant!.isOpen ? GlidoGradients.primaryButton(context.colors) : null,
                          color: _restaurant!.isOpen ? null : context.colors.surface,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: glidoCardShadow(),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_restaurant!.name, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: _restaurant!.isOpen ? Colors.white : context.colors.ink)),
                                  Text(
                                    _restaurant!.isOpen ? 'Open for orders' : 'Closed',
                                    style: TextStyle(fontSize: 12, color: _restaurant!.isOpen ? Colors.white70 : context.colors.muted),
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
                              decoration: BoxDecoration(color: context.colors.primaryLight, borderRadius: BorderRadius.circular(8)),
                              child: Text(_restaurant!.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.colors.primaryDark)),
                            ),
                            const SizedBox(width: 8),
                            Text('★ ${_restaurant!.ratingAvg.toStringAsFixed(1)} (${_restaurant!.ratingCount})', style: TextStyle(color: context.colors.muted, fontSize: 12.5)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      _StatsSection(
                        stats: _stats,
                        loading: _statsLoading,
                        error: _statsError,
                        onRetry: _loadStats,
                        onTapActiveOrders: widget.onViewOrders,
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Text('Restaurant profile', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(width: 10),
                          Expanded(child: Divider(color: context.colors.border, thickness: 1)),
                        ],
                      ),
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

/// Stats overview: today / this week + a tappable active-orders count.
/// Kept as its own widget so a stats-fetch failure only degrades this
/// section (inline retry) instead of the whole dashboard.
class _StatsSection extends StatelessWidget {
  final RestaurantStats? stats;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;
  final VoidCallback? onTapActiveOrders;

  const _StatsSection({
    required this.stats,
    required this.loading,
    required this.error,
    required this.onRetry,
    required this.onTapActiveOrders,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Overview', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 10),
        if (error != null)
          _StatsMessageCard(
            icon: Icons.error_outline,
            message: error!,
            actionLabel: 'Retry',
            onAction: onRetry,
          )
        else if (loading && stats == null)
          const _StatsSkeleton()
        else if (stats != null) ...[
          Row(
            children: [
              Expanded(
                child: _StatTile(
                  label: 'Today',
                  orders: stats!.today.orders,
                  revenue: stats!.today.revenue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatTile(
                  label: 'This week',
                  orders: stats!.last7Days.orders,
                  revenue: stats!.last7Days.revenue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _ActiveOrdersTile(count: stats!.activeOrders, onTap: onTapActiveOrders),
        ],
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final int orders;
  final double revenue;

  const _StatTile({required this.label, required this.orders, required this.revenue});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: glidoCardShadow(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: context.colors.muted)),
          const SizedBox(height: 10),
          Text('₹${revenue.toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('$orders order${orders == 1 ? '' : 's'}', style: TextStyle(fontSize: 12, color: context.colors.muted)),
        ],
      ),
    );
  }
}

class _ActiveOrdersTile extends StatelessWidget {
  final int count;
  final VoidCallback? onTap;

  const _ActiveOrdersTile({required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final hasActive = count > 0;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: hasActive ? context.colors.primaryLight : context.colors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: glidoCardShadow(),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: hasActive ? context.colors.primary : context.colors.surfaceAlt,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.receipt_long, size: 20, color: hasActive ? Colors.white : context.colors.muted),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$count active order${count == 1 ? '' : 's'}',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: hasActive ? context.colors.primaryDark : context.colors.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasActive ? 'Needs attention in the kitchen' : 'All caught up',
                    style: TextStyle(fontSize: 12, color: context.colors.muted),
                  ),
                ],
              ),
            ),
            if (onTap != null) Icon(Icons.chevron_right, color: context.colors.muted),
          ],
        ),
      ),
    );
  }
}

class _StatsMessageCard extends StatelessWidget {
  final IconData icon;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _StatsMessageCard({required this.icon, required this.message, required this.actionLabel, required this.onAction});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: glidoCardShadow(),
      ),
      child: Row(
        children: [
          Icon(icon, color: context.colors.muted, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: TextStyle(fontSize: 12.5, color: context.colors.muted))),
          TextButton(onPressed: onAction, child: Text(actionLabel)),
        ],
      ),
    );
  }
}

class _StatsSkeleton extends StatelessWidget {
  const _StatsSkeleton();

  @override
  Widget build(BuildContext context) {
    Widget block(double height) => Container(
          height: height,
          decoration: BoxDecoration(
            color: context.colors.surface,
            borderRadius: BorderRadius.circular(18),
            boxShadow: glidoCardShadow(),
          ),
        );

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: block(92)),
            const SizedBox(width: 12),
            Expanded(child: block(92)),
          ],
        ),
        const SizedBox(height: 12),
        block(68),
      ],
    );
  }
}
