import 'package:flutter/foundation.dart';

/// Mirrors apps/web/src/lib/cart-context.tsx — single-restaurant cart kept
/// in memory only (no persistence yet; add shared_preferences later if needed).
class CartLineItem {
  final String menuItemId;
  final String name;
  final double price;
  int quantity;
  final List<String> addonNames;
  final double addonsPrice;
  final bool isVeg;

  CartLineItem({
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.addonNames,
    required this.addonsPrice,
    required this.isVeg,
  });
}

class CartState extends ChangeNotifier {
  String? restaurantId;
  String? restaurantName;
  final List<CartLineItem> items = [];

  bool get isEmpty => items.isEmpty;

  bool hasDifferentRestaurantItems(String otherRestaurantId) =>
      restaurantId != null && restaurantId != otherRestaurantId && items.isNotEmpty;

  double get subtotal => items.fold(0, (sum, i) => sum + (i.price + i.addonsPrice) * i.quantity);
  int get itemCount => items.fold(0, (sum, i) => sum + i.quantity);

  void addItem(String rId, String rName, CartLineItem item) {
    if (restaurantId != rId) {
      restaurantId = rId;
      restaurantName = rName;
      items.clear();
    }
    final existingIndex = items.indexWhere(
      (i) => i.menuItemId == item.menuItemId && i.addonNames.join(',') == item.addonNames.join(','),
    );
    if (existingIndex >= 0) {
      items[existingIndex].quantity += item.quantity;
    } else {
      items.add(item);
    }
    notifyListeners();
  }

  void updateQuantity(String menuItemId, int quantity) {
    if (quantity <= 0) {
      items.removeWhere((i) => i.menuItemId == menuItemId);
    } else {
      final item = items.firstWhere((i) => i.menuItemId == menuItemId);
      item.quantity = quantity;
    }
    if (items.isEmpty) {
      restaurantId = null;
      restaurantName = null;
    }
    notifyListeners();
  }

  void clear() {
    restaurantId = null;
    restaurantName = null;
    items.clear();
    notifyListeners();
  }
}
