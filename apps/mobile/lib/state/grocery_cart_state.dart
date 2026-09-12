import 'package:flutter/foundation.dart';

class GroceryCartItem {
  final String productId;
  final String name;
  final double price;
  final String unit;
  final String? imageUrl;
  int quantity;
  final int maxStock;

  GroceryCartItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.unit,
    this.imageUrl,
    required this.quantity,
    required this.maxStock,
  });
}

/// Mirrors apps/web/src/lib/grocery-cart-context.tsx.
class GroceryCartState extends ChangeNotifier {
  final List<GroceryCartItem> items = [];

  double get subtotal => items.fold(0, (sum, i) => sum + i.price * i.quantity);
  int get itemCount => items.fold(0, (sum, i) => sum + i.quantity);

  int quantityOf(String productId) => items.firstWhere((i) => i.productId == productId, orElse: () => GroceryCartItem(productId: '', name: '', price: 0, unit: '', quantity: 0, maxStock: 0)).quantity;

  void addItem(GroceryProductRef product, {int quantity = 1}) {
    final existing = items.where((i) => i.productId == product.id).toList();
    if (existing.isNotEmpty) {
      existing.first.quantity = (existing.first.quantity + quantity).clamp(0, product.stockQty);
    } else {
      items.add(GroceryCartItem(
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        imageUrl: product.imageUrl,
        quantity: quantity.clamp(0, product.stockQty),
        maxStock: product.stockQty,
      ));
    }
    notifyListeners();
  }

  void updateQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      items.removeWhere((i) => i.productId == productId);
    } else {
      final item = items.firstWhere((i) => i.productId == productId);
      item.quantity = quantity.clamp(0, item.maxStock);
    }
    notifyListeners();
  }

  void removeItem(String productId) {
    items.removeWhere((i) => i.productId == productId);
    notifyListeners();
  }

  void clear() {
    items.clear();
    notifyListeners();
  }
}

/// Minimal shape addItem needs — avoids importing the full GroceryProduct model here.
class GroceryProductRef {
  final String id;
  final String name;
  final double price;
  final String unit;
  final String? imageUrl;
  final int stockQty;

  GroceryProductRef({required this.id, required this.name, required this.price, required this.unit, this.imageUrl, required this.stockQty});
}
