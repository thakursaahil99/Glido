import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/order.dart';
import '../../widgets/error_state.dart';
import 'order_detail_screen.dart';

const _statusTabs = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _status = 'ALL';
  List<PartnerOrder>? _orders;
  String? _error;

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
      final query = _status != 'ALL' ? '&status=$_status' : '';
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/partner/orders?pageSize=50$query');
      final items = (res['items'] as List<dynamic>? ?? []).map((o) => PartnerOrder.fromJson(o)).toList();
      setState(() => _orders = items);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  void _selectStatus(String s) {
    setState(() {
      _status = s;
      _orders = null;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _statusTabs.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final tab = _statusTabs[i];
                final selected = tab == _status;
                return ChoiceChip(
                  label: Text(tab.replaceAll('_', ' ')),
                  selected: selected,
                  onSelected: (_) => _selectStatus(tab),
                  selectedColor: GlidoColors.primary,
                  labelStyle: TextStyle(color: selected ? Colors.white : GlidoColors.ink, fontSize: 12.5, fontWeight: FontWeight.w600),
                  backgroundColor: Colors.white,
                  side: BorderSide(color: GlidoColors.border),
                );
              },
            ),
          ),
          Expanded(
            child: _error != null
                ? ErrorStateView(message: _error!, onRetry: _load)
                : _orders == null
                    ? const Center(child: CircularProgressIndicator())
                    : _orders!.isEmpty
                        ? Center(child: Text('No orders in this status', style: TextStyle(color: GlidoColors.muted)))
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _orders!.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (ctx, i) {
                                final o = _orders![i];
                                return InkWell(
                                  borderRadius: BorderRadius.circular(14),
                                  onTap: () async {
                                    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: o.id)));
                                    _load();
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                      boxShadow: glidoCardShadow(),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text('#${o.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
                                              const SizedBox(height: 4),
                                              Text('${o.paymentMethod} · ${o.paymentStatus}', style: TextStyle(color: GlidoColors.muted, fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(8)),
                                              child: Text(o.status.replaceAll('_', ' '), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: GlidoColors.primaryDark)),
                                            ),
                                            const SizedBox(height: 6),
                                            Text('₹${o.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
