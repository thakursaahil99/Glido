import 'user.dart';
import 'order.dart';

class GroceryCategory {
  final String id;
  final String name;
  final String? imageUrl;

  GroceryCategory({required this.id, required this.name, this.imageUrl});

  factory GroceryCategory.fromJson(Map<String, dynamic> json) =>
      GroceryCategory(id: json['id'], name: json['name'], imageUrl: json['imageUrl']);
}

class GroceryProduct {
  final String id;
  final String name;
  final String? imageUrl;
  final String unit;
  final double mrp;
  final double price;
  final int stockQty;
  final bool isAvailable;

  GroceryProduct({
    required this.id,
    required this.name,
    this.imageUrl,
    required this.unit,
    required this.mrp,
    required this.price,
    required this.stockQty,
    required this.isAvailable,
  });

  factory GroceryProduct.fromJson(Map<String, dynamic> json) => GroceryProduct(
        id: json['id'],
        name: json['name'],
        imageUrl: json['imageUrl'],
        unit: json['unit'] ?? '',
        mrp: (json['mrp'] as num).toDouble(),
        price: (json['price'] as num).toDouble(),
        stockQty: json['stockQty'] ?? 0,
        isAvailable: json['isAvailable'] ?? true,
      );
}

class GroceryOrder {
  final String id;
  final String orderNumber;
  final String status;
  final double subtotal;
  final double deliveryFee;
  final double taxAmount;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final DateTime createdAt;
  final Address? address;
  final List<OrderItemLine> items;
  final List<OrderStatusHistoryEntry> statusHistory;
  final DeliveryPartnerInfo? deliveryPartner;

  GroceryOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.subtotal,
    required this.deliveryFee,
    required this.taxAmount,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.createdAt,
    this.address,
    required this.items,
    required this.statusHistory,
    this.deliveryPartner,
  });

  factory GroceryOrder.fromJson(Map<String, dynamic> json) => GroceryOrder(
        id: json['id'],
        orderNumber: json['orderNumber'],
        status: json['status'],
        subtotal: (json['subtotal'] as num).toDouble(),
        deliveryFee: (json['deliveryFee'] as num).toDouble(),
        taxAmount: (json['taxAmount'] as num).toDouble(),
        totalAmount: (json['totalAmount'] as num).toDouble(),
        paymentMethod: json['paymentMethod'],
        paymentStatus: json['paymentStatus'],
        createdAt: DateTime.parse(json['createdAt']),
        address: json['address'] != null ? Address.fromJson(json['address']) : null,
        items: (json['items'] as List<dynamic>? ?? []).map((i) => OrderItemLine.fromJson(i)).toList(),
        statusHistory:
            (json['statusHistory'] as List<dynamic>? ?? []).map((h) => OrderStatusHistoryEntry.fromJson(h)).toList(),
        deliveryPartner: json['deliveryPartner'] != null ? DeliveryPartnerInfo.fromJson(json['deliveryPartner']) : null,
      );
}
