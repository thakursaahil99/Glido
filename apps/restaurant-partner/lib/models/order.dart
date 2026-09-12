class OrderItemLine {
  final String nameSnapshot;
  final int quantity;
  final double subtotal;

  OrderItemLine({required this.nameSnapshot, required this.quantity, required this.subtotal});

  factory OrderItemLine.fromJson(Map<String, dynamic> json) => OrderItemLine(
        nameSnapshot: json['nameSnapshot'],
        quantity: json['quantity'],
        subtotal: (json['subtotal'] as num).toDouble(),
      );
}

class PartnerOrder {
  final String id;
  final String orderNumber;
  final String status;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String? deliveryInstructions;
  final DateTime createdAt;
  final List<OrderItemLine> items;
  final String? addressFull;
  final String? deliveryPartnerName;

  PartnerOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    this.deliveryInstructions,
    required this.createdAt,
    required this.items,
    this.addressFull,
    this.deliveryPartnerName,
  });

  factory PartnerOrder.fromJson(Map<String, dynamic> json) {
    String? addressFull;
    if (json['address'] != null) {
      final a = json['address'];
      addressFull = '${a['line1'] ?? ''}${(a['line2'] != null && a['line2'] != '') ? ', ${a['line2']}' : ''}';
    }
    return PartnerOrder(
      id: json['id'],
      orderNumber: json['orderNumber'],
      status: json['status'],
      totalAmount: (json['totalAmount'] as num).toDouble(),
      paymentMethod: json['paymentMethod'],
      paymentStatus: json['paymentStatus'],
      deliveryInstructions: json['deliveryInstructions'],
      createdAt: DateTime.parse(json['createdAt']),
      items: (json['items'] as List<dynamic>? ?? []).map((i) => OrderItemLine.fromJson(i)).toList(),
      addressFull: addressFull,
      deliveryPartnerName: json['deliveryPartner']?['name'],
    );
  }
}
