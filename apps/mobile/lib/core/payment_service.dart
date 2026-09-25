import 'api_client.dart';

/// Result of asking the backend to prepare payment for an order (POST /orders
/// or POST /grocery-orders already returns this as the `payment` field).
class PaymentIntent {
  /// True when the backend has no real Razorpay keys configured — the demo
  /// fallback lets checkout complete without a paid account (see
  /// apps/api/src/payments/payments.service.ts createOrderForPayment).
  final bool mock;
  final String? keyId;
  final String? razorpayOrderId;
  final double amount;
  final String currency;

  PaymentIntent({
    required this.mock,
    this.keyId,
    this.razorpayOrderId,
    required this.amount,
    required this.currency,
  });

  factory PaymentIntent.fromJson(Map<String, dynamic> json) => PaymentIntent(
        mock: json['mock'] == true,
        keyId: json['keyId'] as String?,
        razorpayOrderId: json['razorpayOrderId'] as String?,
        amount: (json['amount'] as num).toDouble(),
        currency: (json['currency'] as String?) ?? 'INR',
      );
}

class PaymentVerification {
  final String razorpayOrderId;
  final String razorpayPaymentId;
  final String razorpaySignature;

  PaymentVerification({
    required this.razorpayOrderId,
    required this.razorpayPaymentId,
    required this.razorpaySignature,
  });
}

/// Thin wrapper the checkout screens call after placing an ONLINE order,
/// mirroring the web checkout's flow (apps/web/src/lib/razorpay.ts +
/// apps/web/src/app/(site)/checkout/page.tsx placeOrder()):
///
///   1. POST /orders (or /grocery-orders) returns { order, payment }.
///   2. If payment.mock is true, call completeMockPayment — no real gateway
///      configured server-side, so this finishes the order for free (demo mode).
///   3. Otherwise, launch the real Razorpay checkout with payment.keyId /
///      payment.razorpayOrderId, then call PaymentsApi.verify with the
///      signature Razorpay hands back.
///
/// Step 3 is intentionally NOT implemented yet — wiring the actual
/// razorpay_flutter SDK (package + Android/iOS native config) is a separate
/// piece of work. This class is the seam: once that SDK is added, its
/// success callback should call PaymentsApi.verify below and nothing else
/// in the checkout screens needs to change.
class PaymentsApi {
  /// GET the order/grocery-order back is not needed — the payment intent
  /// comes back inline from the create-order call, so callers just wrap it:
  ///   final intent = PaymentIntent.fromJson(res['payment']);
  static PaymentIntent? parseIntent(Map<String, dynamic>? paymentJson) {
    if (paymentJson == null) return null;
    return PaymentIntent.fromJson(paymentJson);
  }

  /// Demo-mode completion — see apps/api/src/payments/payments.controller.ts
  /// POST /payments/mock/:orderId. The backend itself refuses this once real
  /// Razorpay keys are configured, so it's safe to call unconditionally when
  /// `intent.mock` is true.
  static Future<void> completeMockPayment(String orderId) {
    return ApiClient.instance.post('/payments/mock/$orderId', {});
  }

  /// Verifies a completed real Razorpay checkout against the backend, which
  /// checks the HMAC signature server-side before marking the order paid.
  /// See apps/api/src/payments/payments.controller.ts POST /payments/verify.
  ///
  /// Call this from the razorpay_flutter SDK's payment-success handler once
  /// that integration exists — nothing else needs to change to wire it up.
  static Future<void> verify(String orderId, PaymentVerification verification) {
    return ApiClient.instance.post('/payments/verify', {
      'orderId': orderId,
      'razorpayOrderId': verification.razorpayOrderId,
      'razorpayPaymentId': verification.razorpayPaymentId,
      'razorpaySignature': verification.razorpaySignature,
    });
  }

  /// True once payment.mock is false and a real razorpayOrderId is present —
  /// checkout screens can use this to decide whether "Pay online" is actually
  /// actionable yet (it isn't, until the SDK step above is wired in).
  static bool isLiveRazorpayReady(PaymentIntent intent) => !intent.mock && intent.razorpayOrderId != null;
}
