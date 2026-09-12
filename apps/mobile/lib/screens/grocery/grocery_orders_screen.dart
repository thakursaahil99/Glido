import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/grocery.dart';
import '../../widgets/error_state.dart';
import 'grocery_order_detail_screen.dart';

class GroceryOrdersScreen extends StatefulWidget {
  const GroceryOrdersScreen({super.key});

  @override
  State<GroceryOrdersScreen> createState() => _GroceryOrdersScreenState();
}

class _GroceryOrdersScreenState extends State<GroceryOrdersScreen> {
  List<GroceryOrder>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/grocery/orders/me');
      setState(() => _orders = (res['items'] as List<dynamic>).map((o) => GroceryOrder.fromJson(o)).toList());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Grocery orders')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? ErrorStateView(message: _error!, onRetry: _load)
            : _orders == null
                ? const Center(child: CircularProgressIndicator())
                : _orders!.isEmpty
                    ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No grocery orders yet.')))])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders!.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final o = _orders![i];
                          return Card(
                            child: ListTile(
                              title: Text('#${o.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text('₹${o.totalAmount.toStringAsFixed(2)}'),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(8)),
                                child: Text(o.status.replaceAll('_', ' '), style: TextStyle(color: GlidoColors.primaryDark, fontSize: 11, fontWeight: FontWeight.w700)),
                              ),
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => GroceryOrderDetailScreen(orderId: o.id))),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
