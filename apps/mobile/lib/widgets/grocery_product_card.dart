import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../models/grocery.dart';
import '../state/grocery_cart_state.dart';
import 'network_image.dart';

/// Blinkit-style product tile: image, a "delivery time" pill, name/unit,
/// then price and an ADD pill side by side on the same row. Shared by the
/// Home screen's "Grocery essentials" rail, the Grocery tab grid, and
/// Search results so every product looks identical everywhere in the app.
class GroceryProductCard extends StatelessWidget {
  final GroceryProduct product;
  const GroceryProductCard({super.key, required this.product});

  /// No per-product ETA field on the backend yet — derive a stable-looking
  /// 6-19 min estimate from the id so the same product always shows the same
  /// number instead of one that changes every rebuild.
  int get _etaMinutes => 6 + (product.id.hashCode.abs() % 14);

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<GroceryCartState>();
    final p = product;
    final qty = cart.quantityOf(p.id);
    final discountPct = p.mrp > p.price ? (((p.mrp - p.price) / p.mrp) * 100).round() : 0;

    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: glidoCardShadow()),
      clipBehavior: Clip.antiAlias,
      // No mainAxisSize.min — the card sits in a fixed-height slot
      // (mainAxisExtent / SizedBox); the Spacer below absorbs any slack so
      // spacing stays even on every side instead of leaving a gap at the end.
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 86,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                GlidoNetworkImage(url: p.imageUrl, icon: Icons.shopping_basket),
                if (discountPct > 0)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: GlidoColors.success, borderRadius: BorderRadius.circular(6)),
                      child: Text('$discountPct% OFF', style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(9, 8, 9, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(color: GlidoColors.primaryLight, borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.schedule, size: 11, color: GlidoColors.primaryDark),
                        const SizedBox(width: 3),
                        Text('$_etaMinutes MINS', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: GlidoColors.primaryDark)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(p.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, height: 1.2)),
                  const SizedBox(height: 2),
                  Text(p.unit, style: TextStyle(fontSize: 11, color: GlidoColors.muted)),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('₹${p.price.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                            if (p.mrp > p.price)
                              Text('₹${p.mrp.toStringAsFixed(0)}', style: TextStyle(fontSize: 10.5, color: GlidoColors.muted, decoration: TextDecoration.lineThrough)),
                          ],
                        ),
                      ),
                      if (p.stockQty == 0)
                        Text('Sold out', style: TextStyle(fontSize: 10.5, color: GlidoColors.danger, fontWeight: FontWeight.w700))
                      else if (qty == 0)
                        SizedBox(
                          height: 28,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              side: const BorderSide(color: GlidoColors.success, width: 1.4),
                              foregroundColor: GlidoColors.success,
                              backgroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                            ),
                            onPressed: () => cart.addItem(GroceryProductRef(id: p.id, name: p.name, price: p.price, unit: p.unit, imageUrl: p.imageUrl, stockQty: p.stockQty)),
                            child: const Text('ADD', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
                          ),
                        )
                      else
                        Container(
                          height: 28,
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(color: GlidoColors.success, borderRadius: BorderRadius.circular(9)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 26),
                                iconSize: 15,
                                color: Colors.white,
                                onPressed: () => cart.updateQuantity(p.id, qty - 1),
                                icon: const Icon(Icons.remove),
                              ),
                              Text('$qty', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12.5)),
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 26),
                                iconSize: 15,
                                color: Colors.white,
                                onPressed: qty >= p.stockQty ? null : () => cart.updateQuantity(p.id, qty + 1),
                                icon: const Icon(Icons.add),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
