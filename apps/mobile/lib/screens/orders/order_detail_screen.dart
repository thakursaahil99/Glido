import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/order.dart';
import '../../widgets/error_state.dart';

const _statusSteps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  GlidoOrder? _order;
  String? _error;
  int _reviewRating = 5;
  final _reviewCommentCtrl = TextEditingController();
  bool _submittingReview = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    final socket = SocketClient.instance.socket;
    socket.emit('order:subscribe', widget.orderId);
    socket.on('order:update', _onUpdate);
    _poll = Timer.periodic(const Duration(seconds: 6), (_) => _load());
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('order:update', _onUpdate);
    _poll?.cancel();
    super.dispose();
  }

  void _onUpdate(dynamic payload) {
    if (payload is Map && payload['orderId'] == widget.orderId) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/orders/${widget.orderId}');
      setState(() => _order = GlidoOrder.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not load this order.');
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this order?'),
        content: const Text("This can't be undone. If you already paid, a refund will be issued."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep order')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, cancel')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiClient.instance.post('/orders/${widget.orderId}/cancel', {});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _submitReview() async {
    setState(() => _submittingReview = true);
    try {
      await ApiClient.instance.post('/orders/${widget.orderId}/review', {
        'rating': _reviewRating,
        if (_reviewCommentCtrl.text.trim().isNotEmpty) 'comment': _reviewCommentCtrl.text.trim(),
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks for your review!')));
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submittingReview = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: ErrorStateView(message: _error!, onRetry: _load));
    }
    if (_order == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final order = _order!;
    final canCancel = order.status == 'PENDING' || order.status == 'ACCEPTED';

    return Scaffold(
      appBar: AppBar(title: Text('Order #${order.orderNumber}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(order.restaurant?.name ?? '', style: TextStyle(color: GlidoColors.muted)),
          const SizedBox(height: 16),
          if (order.deliveryPartner != null && ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].contains(order.status))
            Card(
              child: ListTile(
                title: Text(order.deliveryPartner!.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${order.deliveryPartner!.vehicleType} · ★ ${order.deliveryPartner!.ratingAvg.toStringAsFixed(1)}'),
                trailing: IconButton(
                  icon: const Icon(Icons.call),
                  onPressed: () => launchUrl(Uri.parse('tel:${order.deliveryPartner!.phone}')),
                ),
              ),
            ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _Timeline(status: order.status),
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
          if (order.status == 'DELIVERED' && order.review == null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Rate this order', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Row(
                      children: List.generate(5, (i) {
                        final n = i + 1;
                        return IconButton(
                          padding: EdgeInsets.zero,
                          onPressed: () => setState(() => _reviewRating = n),
                          icon: Icon(
                            n <= _reviewRating ? Icons.star : Icons.star_border,
                            color: GlidoColors.accent,
                            size: 28,
                          ),
                        );
                      }),
                    ),
                    TextField(
                      controller: _reviewCommentCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(hintText: 'How was your order? (optional)'),
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: _submittingReview ? null : _submitReview,
                      child: Text(_submittingReview ? 'Submitting...' : 'Submit review'),
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (order.review != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Your review: ', style: TextStyle(fontWeight: FontWeight.w700)),
                        ...List.generate(5, (i) => Icon(
                              i < order.review!.rating ? Icons.star : Icons.star_border,
                              color: GlidoColors.accent,
                              size: 16,
                            )),
                      ],
                    ),
                    if (order.review!.comment != null && order.review!.comment!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(order.review!.comment!, style: TextStyle(color: GlidoColors.muted)),
                    ],
                  ],
                ),
              ),
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
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('${i.quantity} × ${i.nameSnapshot}'),
                            Text('₹${i.subtotal.toStringAsFixed(2)}'),
                          ],
                        ),
                      )),
                  const Divider(),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Subtotal'), Text('₹${order.subtotal.toStringAsFixed(2)}')]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Delivery fee'), Text('₹${order.deliveryFee.toStringAsFixed(2)}')]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Tax'), Text('₹${order.taxAmount.toStringAsFixed(2)}')]),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total', style: TextStyle(fontWeight: FontWeight.w800)),
                      Text('₹${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                    ],
                  ),
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
                  Text('Payment: ${order.paymentMethod} · ${order.paymentStatus}', style: TextStyle(color: GlidoColors.muted)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Timeline extends StatelessWidget {
  final String status;
  const _Timeline({required this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'CANCELLED') {
      return Row(
        children: [
          Icon(Icons.cancel, color: GlidoColors.danger),
          const SizedBox(width: 8),
          Text('Order cancelled', style: TextStyle(color: GlidoColors.danger, fontWeight: FontWeight.w700)),
        ],
      );
    }
    final currentIndex = _statusSteps.indexOf(status);
    return Column(
      children: [
        for (var i = 0; i < _statusSteps.length; i++)
          Row(
            children: [
              Icon(
                i <= currentIndex ? Icons.check_circle : Icons.radio_button_unchecked,
                size: 18,
                color: i <= currentIndex ? GlidoColors.primary : GlidoColors.border,
              ),
              const SizedBox(width: 10),
              Text(
                _statusSteps[i].replaceAll('_', ' '),
                style: TextStyle(
                  fontWeight: i == currentIndex ? FontWeight.w800 : FontWeight.w500,
                  color: i <= currentIndex ? GlidoColors.ink : GlidoColors.muted,
                ),
              ),
            ],
          ),
      ],
    );
  }
}
