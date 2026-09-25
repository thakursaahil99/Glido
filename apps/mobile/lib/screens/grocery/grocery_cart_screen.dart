import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/grocery.dart';
import '../../state/grocery_cart_state.dart';
import '../../widgets/network_image.dart';
import 'grocery_checkout_screen.dart';

class GroceryCartScreen extends StatefulWidget {
  const GroceryCartScreen({super.key});

  @override
  State<GroceryCartScreen> createState() => _GroceryCartScreenState();
}

class _GroceryCartScreenState extends State<GroceryCartScreen> {
  List<GroceryProduct>? _missed;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.get<Map<String, dynamic>>('/grocery/products', query: {'pageSize': 20}).then((res) {
      if (!mounted) return;
      final items = (res['items'] as List<dynamic>).map((p) => GroceryProduct.fromJson(p)).toList();
      setState(() => _missed = items);
    }).catchError((_) {
      if (mounted) setState(() => _missed = []);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your grocery cart'),
        actions: [
          Consumer<GroceryCartState>(
            builder: (context, cart, _) => cart.items.isEmpty
                ? const SizedBox.shrink()
                : TextButton(onPressed: cart.clear, child: Text('Clear', style: TextStyle(color: context.colors.danger))),
          ),
        ],
      ),
      body: Consumer<GroceryCartState>(
        builder: (context, cart, _) {
          if (cart.items.isEmpty) {
            return const Center(child: Text('Your grocery cart is empty.'));
          }

          final inCartIds = cart.items.map((i) => i.productId).toSet();
          final missedSuggestions = (_missed ?? []).where((p) => !inCartIds.contains(p.id) && p.stockQty > 0).take(8).toList();

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    for (var i = 0; i < cart.items.length; i++) ...[
                      Builder(builder: (context) {
                        final item = cart.items[i];
                        return Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  Text(item.unit, style: TextStyle(fontSize: 12, color: context.colors.muted)),
                                  Text('₹${item.price.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                ],
                              ),
                            ),
                            IconButton(icon: const Icon(Icons.remove_circle_outline), onPressed: () => cart.updateQuantity(item.productId, item.quantity - 1)),
                            Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: item.quantity >= item.maxStock ? null : () => cart.updateQuantity(item.productId, item.quantity + 1),
                            ),
                            IconButton(icon: Icon(Icons.close, color: context.colors.muted, size: 18), onPressed: () => cart.removeItem(item.productId)),
                          ],
                        );
                      }),
                      if (i != cart.items.length - 1) const Divider(height: 20),
                    ],
                    if (missedSuggestions.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Text('Missed something?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 176,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: missedSuggestions.length,
                          itemBuilder: (context, i) => Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: _MissedProductTile(product: missedSuggestions[i]),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              SafeArea(
                minimum: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Subtotal', style: TextStyle(fontWeight: FontWeight.w600)),
                        Text('₹${cart.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text('Delivery is free above ₹299 (₹25 otherwise). Tax at checkout.', style: TextStyle(fontSize: 11.5, color: context.colors.muted)),
                    ),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GroceryCheckoutScreen())),
                        child: const Text('Proceed to checkout'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Small quick-add card for the "Missed something?" cross-sell row.
class _MissedProductTile extends StatelessWidget {
  final GroceryProduct product;
  const _MissedProductTile({required this.product});

  @override
  Widget build(BuildContext context) {
    final cart = context.read<GroceryCartState>();
    return Container(
      width: 118,
      padding: const EdgeInsets.all(9),
      decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(14), boxShadow: glidoCardShadow(opacity: 0.05)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: GlidoNetworkImage(url: product.imageUrl, icon: Icons.shopping_basket),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 30,
            child: Text(
              product.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, height: 1.2),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('₹${product.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              GestureDetector(
                onTap: () => cart.addItem(GroceryProductRef(
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  unit: product.unit,
                  imageUrl: product.imageUrl,
                  stockQty: product.stockQty,
                )),
                child: Container(
                  height: 22,
                  width: 22,
                  decoration: BoxDecoration(color: context.colors.grocery, shape: BoxShape.circle),
                  child: const Icon(Icons.add, color: Colors.white, size: 14),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
