import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../state/cart_state.dart';
import '../food/restaurant_detail_screen.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your cart')),
      body: Consumer<CartState>(
        builder: (context, cart, _) {
          if (cart.isEmpty) {
            return const Center(child: Text('Your cart is empty.'));
          }
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(cart.restaurantName ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16), overflow: TextOverflow.ellipsis),
                    ),
                    if (cart.restaurantId != null)
                      TextButton(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => RestaurantDetailScreen(restaurantId: cart.restaurantId!)),
                        ),
                        child: Text('+ Add more items', style: TextStyle(color: context.colors.primary, fontWeight: FontWeight.w700, fontSize: 12.5)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: cart.items.length,
                  separatorBuilder: (_, _) => const Divider(height: 24),
                  itemBuilder: (context, i) {
                    final item = cart.items[i];
                    return Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              if (item.addonNames.isNotEmpty)
                                Text(item.addonNames.join(', '), style: TextStyle(fontSize: 12, color: context.colors.muted)),
                              const SizedBox(height: 4),
                              Text('₹${(item.price + item.addonsPrice).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            ],
                          ),
                        ),
                        _QuantityStepper(
                          quantity: item.quantity,
                          onChanged: (q) => cart.updateQuantity(item.menuItemId, q),
                        ),
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
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CheckoutScreen())),
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

class _QuantityStepper extends StatelessWidget {
  final int quantity;
  final void Function(int) onChanged;

  const _QuantityStepper({required this.quantity, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: () => onChanged(quantity - 1),
          icon: const Icon(Icons.remove_circle_outline),
          tooltip: 'Decrease quantity',
          visualDensity: VisualDensity.compact,
        ),
        Text('$quantity', style: const TextStyle(fontWeight: FontWeight.w700)),
        IconButton(
          onPressed: () => onChanged(quantity + 1),
          icon: const Icon(Icons.add_circle_outline),
          tooltip: 'Increase quantity',
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}
