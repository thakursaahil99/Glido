import 'restaurant.dart';
import 'user.dart';

class OrderItemLine {
  final String id;
  final String nameSnapshot;
  final double priceSnapshot;
  final int quantity;
  final double subtotal;

  OrderItemLine({
    required this.id,
    required this.nameSnapshot,
    required this.priceSnapshot,
    required this.quantity,
    required this.subtotal,
  });

  factory OrderItemLine.fromJson(Map<String, dynamic> json) => OrderItemLine(
        id: json['id'],
        nameSnapshot: json['nameSnapshot'],
        priceSnapshot: (json['priceSnapshot'] as num).toDouble(),
        quantity: json['quantity'],
        subtotal: (json['subtotal'] as num).toDouble(),
      );
}

class OrderStatusHistoryEntry {
  final String status;
  final String? note;
  final DateTime changedAt;

  OrderStatusHistoryEntry({required this.status, this.note, required this.changedAt});

  factory OrderStatusHistoryEntry.fromJson(Map<String, dynamic> json) => OrderStatusHistoryEntry(
        status: json['status'],
        note: json['note'],
        changedAt: DateTime.parse(json['changedAt']),
      );
}

class DeliveryPartnerInfo {
  final String name;
  final String phone;
  final String vehicleType;
  final double ratingAvg;

  DeliveryPartnerInfo({required this.name, required this.phone, required this.vehicleType, required this.ratingAvg});

  factory DeliveryPartnerInfo.fromJson(Map<String, dynamic> json) => DeliveryPartnerInfo(
        name: json['name'],
        phone: json['phone'],
        vehicleType: json['vehicleType'] ?? 'Bike',
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 5,
      );
}

class OrderReview {
  final String id;
  final int rating;
  final String? comment;

  OrderReview({required this.id, required this.rating, this.comment});

  factory OrderReview.fromJson(Map<String, dynamic> json) =>
      OrderReview(id: json['id'], rating: json['rating'], comment: json['comment']);
}

class GlidoOrder {
  final String id;
  final String orderNumber;
  final String status;
  final double subtotal;
  final double deliveryFee;
  final double packagingFee;
  final double taxAmount;
  final double discountAmount;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String? deliveryInstructions;
  final DateTime createdAt;
  final Restaurant? restaurant;
  final Address? address;
  final List<OrderItemLine> items;
  final List<OrderStatusHistoryEntry> statusHistory;
  final DeliveryPartnerInfo? deliveryPartner;
  final OrderReview? review;

  GlidoOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.subtotal,
    required this.deliveryFee,
    required this.packagingFee,
    required this.taxAmount,
    required this.discountAmount,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    this.deliveryInstructions,
    required this.createdAt,
    this.restaurant,
    this.address,
    required this.items,
    required this.statusHistory,
    this.deliveryPartner,
    this.review,
  });

  factory GlidoOrder.fromJson(Map<String, dynamic> json) => GlidoOrder(
        id: json['id'],
        orderNumber: json['orderNumber'],
        status: json['status'],
        subtotal: (json['subtotal'] as num).toDouble(),
        deliveryFee: (json['deliveryFee'] as num).toDouble(),
        packagingFee: (json['packagingFee'] as num).toDouble(),
        taxAmount: (json['taxAmount'] as num).toDouble(),
        discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num).toDouble(),
        paymentMethod: json['paymentMethod'],
        paymentStatus: json['paymentStatus'],
        deliveryInstructions: json['deliveryInstructions'],
        createdAt: DateTime.parse(json['createdAt']),
        restaurant: json['restaurant'] != null ? Restaurant.fromJson(json['restaurant']) : null,
        address: json['address'] != null ? Address.fromJson(json['address']) : null,
        items: (json['items'] as List<dynamic>? ?? []).map((i) => OrderItemLine.fromJson(i)).toList(),
        statusHistory:
            (json['statusHistory'] as List<dynamic>? ?? []).map((h) => OrderStatusHistoryEntry.fromJson(h)).toList(),
        deliveryPartner: json['deliveryPartner'] != null ? DeliveryPartnerInfo.fromJson(json['deliveryPartner']) : null,
        review: json['review'] != null ? OrderReview.fromJson(json['review']) : null,
      );
}
