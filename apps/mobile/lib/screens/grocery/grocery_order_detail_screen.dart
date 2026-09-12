import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/grocery.dart';
import '../../widgets/error_state.dart';

const _statusSteps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

class GroceryOrderDetailScreen extends StatefulWidget {
  final String orderId;
  const GroceryOrderDetailScreen({super.key, required this.orderId});

  @override
  State<GroceryOrderDetailScreen> createState() => _GroceryOrderDetailScreenState();
}

class _GroceryOrderDetailScreenState extends State<GroceryOrderDetailScreen> {
  GroceryOrder? _order;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    final socket = SocketClient.instance.socket;
    socket.emit('order:subscribe', widget.orderId);
    socket.on('order:update', _onUpdate);
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('order:update', _onUpdate);
    super.dispose();
  }

  void _onUpdate(dynamic payload) {
    if (payload is Map && payload['orderId'] == widget.orderId) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/grocery/orders/${widget.orderId}');
      setState(() => _order = GroceryOrder.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this order?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep order')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, cancel')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiClient.instance.post('/grocery/orders/${widget.orderId}/cancel', {});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Scaffold(appBar: AppBar(), body: ErrorStateView(message: _error!, onRetry: _load));
    if (_order == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final order = _order!;
    final canCancel = order.status == 'PENDING' || order.status == 'ACCEPTED';
    final currentIndex = _statusSteps.indexOf(order.status);

    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.orderNumber}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (order.deliveryPartner != null && ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].contains(order.status))
            Card(
              child: ListTile(
                title: Text(order.deliveryPartner!.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(order.deliveryPartner!.vehicleType),
                trailing: IconButton(icon: const Icon(Icons.call), onPressed: () => launchUrl(Uri.parse('tel:${order.deliveryPartner!.phone}'))),
              ),
            ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: order.status == 'CANCELLED'
                  ? Row(children: [Icon(Icons.cancel, color: GlidoColors.danger), const SizedBox(width: 8), Text('Order cancelled', style: TextStyle(color: GlidoColors.danger, fontWeight: FontWeight.w700))])
                  : Column(
                      children: [
                        for (var i = 0; i < _statusSteps.length; i++)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2),
                            child: Row(
                              children: [
                                Icon(i <= currentIndex ? Icons.check_circle : Icons.radio_button_unchecked, size: 18, color: i <= currentIndex ? GlidoColors.primary : GlidoColors.border),
                                const SizedBox(width: 10),
                                Text(_statusSteps[i].replaceAll('_', ' '), style: TextStyle(fontWeight: i == currentIndex ? FontWeight.w800 : FontWeight.w500)),
                              ],
                            ),
                          ),
                      ],
                    ),
            ),
          ),
          if (canCancel) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _cancel,
              style: OutlinedButton.styleFrom(foregroundColor: GlidoColors.danger, side: BorderSide(color: GlidoColors.danger)),
              child: const Text('Cancel order'),
            ),
          ],
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Items', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...order.items.map((i) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('${i.quantity} × ${i.nameSnapshot}'), Text('₹${i.subtotal.toStringAsFixed(2)}')]),
                      )),
                  const Divider(),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Total', style: TextStyle(fontWeight: FontWeight.w800)), Text('₹${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800))]),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Delivery details', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Text(order.address?.full ?? ''),
                  const SizedBox(height: 6),
                  Text('Payment: ${order.paymentMethod == 'WALLET' ? 'Glido Wallet' : 'Cash on delivery'} · ${order.paymentStatus}', style: TextStyle(color: GlidoColors.muted)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
