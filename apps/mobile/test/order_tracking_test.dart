import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glido_customer/models/order_tracking.dart';
import 'package:glido_customer/widgets/tracking_map.dart';
import 'package:latlong2/latlong.dart';

Map<String, dynamic> _snapshot({Map<String, dynamic>? rider, String status = 'OUT_FOR_DELIVERY'}) => {
      'orderId': 'o1',
      'orderNumber': 'GL1',
      'status': status,
      'restaurant': {'name': 'Pizza Bros', 'lat': 18.93, 'lng': 72.83},
      'drop': <String, dynamic>{'label': 'Home', 'line1': '12 Marine Drive', 'lat': 18.95, 'lng': 72.81},
      'rider': rider,
      'etaMinutes': 9,
      'remainingKm': 2.4,
    };

void main() {
  test('parses a tracking snapshot from the API', () {
    final t = OrderTracking.fromJson(_snapshot(rider: {
      'name': 'Rakesh',
      'phone': '+91',
      'vehicleType': 'Bike',
      'ratingAvg': 4.8,
      'lat': 18.94,
      'lng': 72.82,
      'heading': 90,
      'lastLocationAt': '2026-10-17T07:00:00.000Z',
    }));
    expect(t.pickedUp, isTrue);
    expect(t.restaurant, const LatLng(18.93, 72.83));
    expect(t.drop, const LatLng(18.95, 72.81));
    expect(t.rider!.position, const LatLng(18.94, 72.82));
    expect(t.etaMinutes, 9);
  });

  test('missing coordinates become null points, not a crash', () {
    final json = _snapshot(status: 'PREPARING');
    (json['drop'] as Map)['lat'] = null;
    final t = OrderTracking.fromJson(json);
    expect(t.drop, isNull);
    expect(t.rider, isNull);
    expect(t.pickedUp, isFalse);
  });

  test('a socket order:location push moves the rider and updates the ETA', () {
    final t = OrderTracking.fromJson(_snapshot(rider: {'name': 'Rakesh', 'phone': '', 'vehicleType': 'Bike', 'ratingAvg': 5, 'lat': 18.94, 'lng': 72.82}));
    final moved = t.withRiderFix({'orderId': 'o1', 'lat': 18.945, 'lng': 72.815, 'heading': 300, 'at': '2026-10-17T07:01:00.000Z', 'etaMinutes': 4, 'remainingKm': 0.9});
    expect(moved.rider!.position, const LatLng(18.945, 72.815));
    expect(moved.rider!.heading, 300);
    expect(moved.etaMinutes, 4);
    expect(moved.rider!.name, 'Rakesh');
  });

  testWidgets('tracking map renders restaurant, home and rider markers', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: TrackingMap(
          restaurant: LatLng(18.93, 72.83),
          drop: LatLng(18.95, 72.81),
          rider: LatLng(18.94, 72.82),
          riderHeading: 45,
          pickedUp: true,
          riderColor: Colors.deepOrange,
          userAgentPackageName: 'app.glido.test',
          showTiles: false,
        ),
      ),
    ));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byIcon(Icons.storefront), findsOneWidget);
    expect(find.byIcon(Icons.home_rounded), findsOneWidget);
    expect(find.byIcon(Icons.delivery_dining), findsOneWidget);
    expect(find.byIcon(Icons.navigation), findsOneWidget);
  });
}
