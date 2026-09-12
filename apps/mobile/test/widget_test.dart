import 'package:flutter_test/flutter_test.dart';

import 'package:glido_customer/main.dart';

void main() {
  testWidgets('App boots to the login screen when logged out', (WidgetTester tester) async {
    await tester.pumpWidget(const GlidoApp());
    await tester.pump();

    expect(find.text('Sign in'), findsWidgets);
  });
}
