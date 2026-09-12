import 'package:flutter_test/flutter_test.dart';

import 'package:glido_delivery/main.dart';

void main() {
  testWidgets('App boots to the login screen when logged out', (WidgetTester tester) async {
    await tester.pumpWidget(const GlidoDeliveryApp());
    await tester.pump();

    expect(find.text('Sign in'), findsWidgets);
  });
}
