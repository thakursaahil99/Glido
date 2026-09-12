import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../state/grocery_cart_state.dart';
import 'grocery_checkout_screen.dart';

class GroceryCartScreen extends StatelessWidget {
  const GroceryCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your grocery cart'),
        actions: [
          Consumer<GroceryCartState>(
            builder: (context, cart, _) => cart.items.isEmpty
                ? const SizedBox.shrink()
                : TextButton(onPressed: cart.clear, child: Text('Clear', style: TextStyle(color: GlidoColors.danger))),
          ),
        ],
      ),
      body: Consumer<GroceryCartState>(
        builder: (context, cart, _) {
          if (cart.items.isEmpty) {
            return const Center(child: Text('Your grocery cart is empty.'));
          }
          return Column(
            children: [
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: cart.items.length,
                  separatorBuilder: (_, _) => const Divider(height: 20),
                  itemBuilder: (context, i) {
                    final item = cart.items[i];
                    return Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(item.unit, style: TextStyle(fontSize: 12, color: GlidoColors.muted)),
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
                        IconButton(icon: Icon(Icons.close, color: GlidoColors.muted, size: 18), onPressed: () => cart.removeItem(item.productId)),
                      ],
                    );
                  },
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
                      child: Text('Delivery is free above ₹299 (₹25 otherwise). Tax at checkout.', style: TextStyle(fontSize: 11.5, color: GlidoColors.muted)),
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
