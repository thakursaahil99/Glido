import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../state/auth_state.dart';
import '../../state/cart_state.dart';
import '../../widgets/phone_required_field.dart';
import '../orders/order_detail_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  List<Address>? _addresses;
  String? _selectedAddressId;
  String _paymentMethod = 'COD';
  double _walletBalance = 0;
  double _taxRatePercent = 5;
  bool _placing = false;
  String? _error;
  final _instructionsCtrl = TextEditingController();
  final _couponCtrl = TextEditingController();
  double? _couponDiscount;
  String? _couponError;
  bool _applyingCoupon = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final addressesRes = await ApiClient.instance.get<List<dynamic>>('/users/me/addresses');
      final addresses = addressesRes.map((a) => Address.fromJson(a)).toList();
      final wallet = await ApiClient.instance.get<Map<String, dynamic>>('/wallet/me');
      final settings = await ApiClient.instance.get<Map<String, dynamic>>('/settings');
      setState(() {
        _addresses = addresses;
        _selectedAddressId = addresses.isNotEmpty
            ? addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first).id
            : null;
        _walletBalance = (wallet['balance'] as num).toDouble();
        _taxRatePercent = (settings['taxRatePercent'] as num).toDouble();
      });
    } catch (_) {
      setState(() => _addresses = []);
    }
  }

  Future<void> _applyCoupon(double subtotal, String? restaurantId) async {
    if (_couponCtrl.text.trim().isEmpty) return;
    setState(() {
      _applyingCoupon = true;
      _couponError = null;
    });
    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>('/coupons/validate', {
        'code': _couponCtrl.text.trim().toUpperCase(),
        if (restaurantId != null) 'restaurantId': restaurantId,
        'subtotal': subtotal,
      });
      setState(() => _couponDiscount = (res['discount'] as num).toDouble());
    } on ApiException catch (e) {
      setState(() {
        _couponDiscount = null;
        _couponError = e.message;
      });
    } finally {
      if (mounted) setState(() => _applyingCoupon = false);
    }
  }

  Future<void> _placeOrder(CartState cart) async {
    if (_selectedAddressId == null) return;
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>('/orders', {
        'restaurantId': cart.restaurantId,
        'addressId': _selectedAddressId,
        'items': cart.items
            .map((i) => {
                  'menuItemId': i.menuItemId,
                  'quantity': i.quantity,
                  'addonNames': i.addonNames,
                })
            .toList(),
        'paymentMethod': _paymentMethod,
        if (_instructionsCtrl.text.trim().isNotEmpty) 'deliveryInstructions': _instructionsCtrl.text.trim(),
        if (_couponDiscount != null) 'couponCode': _couponCtrl.text.trim().toUpperCase(),
      });
      final orderId = res['order']['id'] as String;
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not place order.');
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final taxAmount = cart.subtotal * (_taxRatePercent / 100);
    // Restaurant delivery/packaging fee aren't stored on the cart; estimate as
    // zero here and let the server compute the authoritative total.
    final estimatedTotal = (cart.subtotal + taxAmount - (_couponDiscount ?? 0)).clamp(0, double.infinity).toDouble();

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _addresses == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const PhoneRequiredField(),
                const Text('Delivery address', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (_addresses!.isEmpty) const Text('Add an address from your profile before checking out.'),
                ..._addresses!.map(
                  (a) => RadioListTile<String>(
                    value: a.id,
                    groupValue: _selectedAddressId,
                    onChanged: (v) => setState(() => _selectedAddressId = v),
                    title: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(a.full),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
                RadioListTile<String>(
                  value: 'COD',
                  groupValue: _paymentMethod,
                  onChanged: (v) => setState(() => _paymentMethod = v!),
                  title: const Text('Cash on delivery'),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<String>(
                  value: 'WALLET',
                  groupValue: _paymentMethod,
                  onChanged: (v) => setState(() => _paymentMethod = v!),
                  title: Text('Glido Wallet · ₹${_walletBalance.toStringAsFixed(2)} available'),
                  contentPadding: EdgeInsets.zero,
                ),
                if (_paymentMethod == 'WALLET' && _walletBalance < estimatedTotal)
                  Text('Insufficient wallet balance — add money from your profile.', style: TextStyle(color: GlidoColors.danger, fontSize: 12.5)),
                const SizedBox(height: 16),
                const Text('Coupon', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _couponCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(hintText: 'Enter coupon code (try GLIDO50)'),
                        onChanged: (_) => setState(() => _couponDiscount = null),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _applyingCoupon ? null : () => _applyCoupon(cart.subtotal, cart.restaurantId),
                      child: Text(_applyingCoupon ? '...' : 'Apply'),
                    ),
                  ],
                ),
                if (_couponError != null)
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text(_couponError!, style: TextStyle(color: GlidoColors.danger, fontSize: 12.5))),
                if (_couponDiscount != null)
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('₹${_couponDiscount!.toStringAsFixed(2)} discount applied', style: TextStyle(color: GlidoColors.success, fontSize: 12.5, fontWeight: FontWeight.w600))),
                const SizedBox(height: 16),
                const Text('Delivery instructions (optional)', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                TextField(controller: _instructionsCtrl, maxLines: 2, decoration: const InputDecoration(hintText: 'E.g. Leave at the door')),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Order summary', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _SummaryRow(label: 'Subtotal', value: cart.subtotal),
                        _SummaryRow(label: 'Tax (est.)', value: taxAmount),
                        if (_couponDiscount != null) _SummaryRow(label: 'Coupon discount', value: -_couponDiscount!),
                        const Divider(),
                        _SummaryRow(label: 'Total (est.)', value: estimatedTotal, bold: true),
                        Text('Delivery & packaging fees are added by the restaurant at checkout.',
                            style: TextStyle(fontSize: 11, color: GlidoColors.muted)),
                      ],
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: GlidoColors.danger)),
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: (_placing ||
                          context.watch<AuthState>().user?.phone == null ||
                          _selectedAddressId == null ||
                          (_paymentMethod == 'WALLET' && _walletBalance < estimatedTotal))
                      ? null
                      : () => _placeOrder(cart),
                  child: Text(_placing ? 'Placing order...' : 'Place order'),
                ),
              ],
            ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final double value;
  final bool bold;
  const _SummaryRow({required this.label, required this.value, this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text('₹${value.toStringAsFixed(2)}', style: style),
        ],
      ),
    );
  }
}
