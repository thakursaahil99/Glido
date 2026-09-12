import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:glido_restaurant_partner/main.dart';

void main() {
  testWidgets('App boots to login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const GlidoRestaurantPartnerApp());
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
