import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/order.dart';
import '../../widgets/error_state.dart';

const Map<String, List<String>> _nextStatus = {
  'PENDING': ['ACCEPTED', 'CANCELLED'],
  'ACCEPTED': ['PREPARING', 'CANCELLED'],
  'PREPARING': ['READY', 'CANCELLED'],
  'READY': ['OUT_FOR_DELIVERY'],
  'OUT_FOR_DELIVERY': ['DELIVERED'],
};

const List<String> _statusOrder = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  PartnerOrder? _order;
  String? _error;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _load();
    SocketClient.instance.socket.emit('order:subscribe', widget.orderId);
    SocketClient.instance.socket.on('order:update', _onUpdate);
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
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/partner/orders/${widget.orderId}');
      setState(() => _order = PartnerOrder.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _setStatus(String status) async {
    setState(() => _updating = true);
    try {
      await ApiClient.instance.patch('/partner/orders/${widget.orderId}/status', {'status': status});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order marked ${status.replaceAll('_', ' ').toLowerCase()}')));
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_order != null ? 'Order #${_order!.orderNumber}' : 'Order')),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : _order == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(10)),
                            child: Text(_order!.status.replaceAll('_', ' '), style: TextStyle(color: GlidoColors.primaryDark, fontWeight: FontWeight.w700, fontSize: 12.5)),
                          ),
                          const Spacer(),
                          Text('₹${_order!.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if ((_nextStatus[_order!.status] ?? []).isNotEmpty) ...[
                        _SectionCard(
                          title: 'Update status',
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: (_nextStatus[_order!.status] ?? []).map((s) {
                              final isCancel = s == 'CANCELLED';
                              return isCancel
                                  ? OutlinedButton(
                                      onPressed: _updating ? null : () => _setStatus(s),
                                      style: OutlinedButton.styleFrom(foregroundColor: GlidoColors.danger, side: BorderSide(color: GlidoColors.danger)),
                                      child: Text(s.replaceAll('_', ' ')),
                                    )
                                  : ElevatedButton(onPressed: _updating ? null : () => _setStatus(s), child: Text(s.replaceAll('_', ' ')));
                            }).toList(),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      _SectionCard(
                        title: 'Timeline',
                        child: Column(
                          children: _statusOrder.map((s) {
                            final currentIndex = _statusOrder.indexOf(_order!.status);
                            final thisIndex = _statusOrder.indexOf(s);
                            final reached = _order!.status != 'CANCELLED' && thisIndex <= currentIndex;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Icon(reached ? Icons.check_circle : Icons.radio_button_unchecked, size: 16, color: reached ? GlidoColors.success : GlidoColors.border),
                                  const SizedBox(width: 8),
                                  Text(s.replaceAll('_', ' '), style: TextStyle(fontSize: 13, color: reached ? GlidoColors.ink : GlidoColors.muted)),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_order!.deliveryPartnerName != null) ...[
                        _SectionCard(title: 'Delivery partner', child: Text(_order!.deliveryPartnerName!, style: const TextStyle(fontSize: 13.5))),
                        const SizedBox(height: 12),
                      ],
                      _SectionCard(
                        title: 'Items',
                        child: Column(
                          children: [
                            ..._order!.items.map((item) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 3),
                                  child: Row(
                                    children: [
                                      Expanded(child: Text('${item.quantity} × ${item.nameSnapshot}', style: const TextStyle(fontSize: 13.5))),
                                      Text('₹${item.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13.5)),
                                    ],
                                  ),
                                )),
                            const Divider(height: 18),
                            Row(
                              children: [
                                const Expanded(child: Text('Total', style: TextStyle(fontWeight: FontWeight.w800))),
                                Text('₹${_order!.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      _SectionCard(
                        title: 'Delivery address',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_order!.addressFull ?? '—', style: const TextStyle(fontSize: 13.5)),
                            if (_order!.deliveryInstructions != null && _order!.deliveryInstructions!.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text('Note: ${_order!.deliveryInstructions}', style: TextStyle(color: GlidoColors.muted, fontSize: 12.5)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: glidoCardShadow()),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}
