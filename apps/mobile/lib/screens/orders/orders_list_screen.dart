import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/order.dart';
import '../../widgets/error_state.dart';
import 'order_detail_screen.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> {
  List<GlidoOrder>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/orders/me');
      final items = (res['items'] as List<dynamic>).map((o) => GlidoOrder.fromJson(o)).toList();
      setState(() => _orders = items);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not load your orders.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your orders')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _load);
    if (_orders == null) return const Center(child: CircularProgressIndicator());
    if (_orders!.isEmpty) {
      return ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No orders yet.')))]);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _orders!.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final o = _orders![i];
        return Card(
          child: ListTile(
            title: Text('#${o.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('${o.restaurant?.name ?? ''} · ₹${o.totalAmount.toStringAsFixed(2)}'),
            trailing: _StatusBadge(status: o.status),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id))),
          ),
        );
      },
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'DELIVERED' => context.colors.success,
      'CANCELLED' => context.colors.danger,
      _ => context.colors.primary,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
