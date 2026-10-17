import 'package:latlong2/latlong.dart';

// Mirrors GET /orders/:id/tracking (apps/api/src/tracking/tracking.service.ts).
// Kept identical across the customer, delivery and restaurant-partner apps.

LatLng? _point(dynamic lat, dynamic lng) =>
    lat is num && lng is num ? LatLng(lat.toDouble(), lng.toDouble()) : null;

class TrackingRider {
  final String name;
  final String phone;
  final String? photoUrl;
  final String vehicleType;
  final String? vehicleNumber;
  final double ratingAvg;
  final LatLng? position;
  final double? heading;
  final DateTime? lastLocationAt;

  TrackingRider({
    required this.name,
    required this.phone,
    this.photoUrl,
    required this.vehicleType,
    this.vehicleNumber,
    required this.ratingAvg,
    this.position,
    this.heading,
    this.lastLocationAt,
  });

  factory TrackingRider.fromJson(Map<String, dynamic> j) => TrackingRider(
        name: j['name'] ?? '',
        phone: j['phone'] ?? '',
        photoUrl: j['photoUrl'],
        vehicleType: j['vehicleType'] ?? 'Bike',
        vehicleNumber: j['vehicleNumber'],
        ratingAvg: (j['ratingAvg'] as num?)?.toDouble() ?? 5,
        position: _point(j['lat'], j['lng']),
        heading: (j['heading'] as num?)?.toDouble(),
        lastLocationAt: j['lastLocationAt'] != null ? DateTime.tryParse(j['lastLocationAt']) : null,
      );

  TrackingRider moved(LatLng to, double? heading, DateTime at) => TrackingRider(
        name: name,
        phone: phone,
        photoUrl: photoUrl,
        vehicleType: vehicleType,
        vehicleNumber: vehicleNumber,
        ratingAvg: ratingAvg,
        position: to,
        heading: heading,
        lastLocationAt: at,
      );
}

class OrderTracking {
  final String orderId;
  final String orderNumber;
  final String status;
  final String restaurantName;
  final LatLng? restaurant;
  final String dropLabel;
  final String dropLine1;
  final LatLng? drop;
  final TrackingRider? rider;
  final int? etaMinutes;
  final double? remainingKm;

  OrderTracking({
    required this.orderId,
    required this.orderNumber,
    required this.status,
    required this.restaurantName,
    this.restaurant,
    required this.dropLabel,
    required this.dropLine1,
    this.drop,
    this.rider,
    this.etaMinutes,
    this.remainingKm,
  });

  bool get pickedUp => status == 'OUT_FOR_DELIVERY';

  factory OrderTracking.fromJson(Map<String, dynamic> j) {
    final r = j['restaurant'] as Map<String, dynamic>? ?? {};
    final d = j['drop'] as Map<String, dynamic>? ?? {};
    return OrderTracking(
      orderId: j['orderId'],
      orderNumber: j['orderNumber'] ?? '',
      status: j['status'],
      restaurantName: r['name'] ?? '',
      restaurant: _point(r['lat'], r['lng']),
      dropLabel: d['label'] ?? 'Home',
      dropLine1: d['line1'] ?? '',
      drop: _point(d['lat'], d['lng']),
      rider: j['rider'] != null ? TrackingRider.fromJson(j['rider']) : null,
      etaMinutes: (j['etaMinutes'] as num?)?.toInt(),
      remainingKm: (j['remainingKm'] as num?)?.toDouble(),
    );
  }

  /// Applies a socket `order:location` push without refetching the whole snapshot.
  OrderTracking withRiderFix(Map<dynamic, dynamic> e) {
    final to = _point(e['lat'], e['lng']);
    if (rider == null || to == null) return this;
    return OrderTracking(
      orderId: orderId,
      orderNumber: orderNumber,
      status: status,
      restaurantName: restaurantName,
      restaurant: restaurant,
      dropLabel: dropLabel,
      dropLine1: dropLine1,
      drop: drop,
      rider: rider!.moved(to, (e['heading'] as num?)?.toDouble(), DateTime.tryParse('${e['at']}') ?? DateTime.now()),
      etaMinutes: (e['etaMinutes'] as num?)?.toInt() ?? etaMinutes,
      remainingKm: (e['remainingKm'] as num?)?.toDouble() ?? remainingKm,
    );
  }
}
