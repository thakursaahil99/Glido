class AssignedOrderItem {
  final String nameSnapshot;
  final int quantity;

  AssignedOrderItem({required this.nameSnapshot, required this.quantity});

  factory AssignedOrderItem.fromJson(Map<String, dynamic> json) =>
      AssignedOrderItem(nameSnapshot: json['nameSnapshot'], quantity: json['quantity']);
}

class AssignedAddress {
  final String label;
  final String line1;
  final String? line2;
  final String? pincode;

  AssignedAddress({required this.label, required this.line1, this.line2, this.pincode});

  factory AssignedAddress.fromJson(Map<String, dynamic> json) => AssignedAddress(
        label: json['label'] ?? '',
        line1: json['line1'] ?? '',
        line2: json['line2'],
        pincode: json['pincode'],
      );

  String get full => '$line1${line2 != null && line2!.isNotEmpty ? ', $line2' : ''}';
}

/// A single shape covering both Food (Order) and Grocery (GroceryOrder)
/// assignments — the `kind` field says which one it is, and which endpoint
/// to call for a status update (/delivery-partner/me/orders/{kind}/:id/status).
class AssignedOrder {
  final String id;
  final String orderNumber;
  final String status;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String? deliveryInstructions;
  final String kind; // "food" | "grocery"
  final String? restaurantName;
  final AssignedAddress? address;
  final List<AssignedOrderItem> items;

  AssignedOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    this.deliveryInstructions,
    required this.kind,
    this.restaurantName,
    this.address,
    required this.items,
  });

  factory AssignedOrder.fromJson(Map<String, dynamic> json) => AssignedOrder(
        id: json['id'],
        orderNumber: json['orderNumber'],
        status: json['status'],
        totalAmount: (json['totalAmount'] as num).toDouble(),
        paymentMethod: json['paymentMethod'],
        paymentStatus: json['paymentStatus'],
        deliveryInstructions: json['deliveryInstructions'],
        kind: json['kind'],
        restaurantName: json['restaurant']?['name'],
        address: json['address'] != null ? AssignedAddress.fromJson(json['address']) : null,
        items: (json['items'] as List<dynamic>? ?? []).map((i) => AssignedOrderItem.fromJson(i)).toList(),
      );
}
