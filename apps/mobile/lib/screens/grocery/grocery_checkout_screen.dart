import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../state/auth_state.dart';
import '../../state/grocery_cart_state.dart';
import '../../widgets/phone_required_field.dart';
import 'grocery_order_detail_screen.dart';

class GroceryCheckoutScreen extends StatefulWidget {
  const GroceryCheckoutScreen({super.key});

  @override
  State<GroceryCheckoutScreen> createState() => _GroceryCheckoutScreenState();
}

const _kPresetInstructions = ['Avoid calling', 'Leave at door', "Don't ring bell", 'Leave with guard'];
const _kTipOptions = [20, 30, 50];

class _GroceryCheckoutScreenState extends State<GroceryCheckoutScreen> {
  List<Address>? _addresses;
  String? _selectedAddressId;
  String _paymentMethod = 'COD';
  double _walletBalance = 0;
  double _taxRatePercent = 5;
  double _groceryDeliveryFee = 25;
  double _freeDeliveryThreshold = 299;
  bool _placing = false;
  String? _error;
  final _couponCtrl = TextEditingController();
  double? _couponDiscount;
  String? _couponError;
  bool _applyingCoupon = false;

  final Set<String> _presetInstructions = {};
  final _instructionsCtrl = TextEditingController();
  double _tip = 0;
  bool _customTipOpen = false;
  final _customTipCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _couponCtrl.dispose();
    _instructionsCtrl.dispose();
    _customTipCtrl.dispose();
    super.dispose();
  }

  void _togglePreset(String label) {
    setState(() {
      if (_presetInstructions.contains(label)) {
        _presetInstructions.remove(label);
      } else {
        _presetInstructions.add(label);
      }
    });
  }

  String? _composedInstructions() {
    final parts = [..._presetInstructions, _instructionsCtrl.text.trim()].where((s) => s.isNotEmpty).toList();
    return parts.isEmpty ? null : parts.join(', ');
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
        _groceryDeliveryFee = (settings['groceryDeliveryFee'] as num).toDouble();
        _freeDeliveryThreshold = (settings['groceryFreeDeliveryThreshold'] as num).toDouble();
      });
    } catch (_) {
      setState(() => _addresses = []);
    }
  }

  Future<void> _applyCoupon(double subtotal) async {
    if (_couponCtrl.text.trim().isEmpty) return;
    setState(() {
      _applyingCoupon = true;
      _couponError = null;
    });
    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>('/coupons/validate', {
        'code': _couponCtrl.text.trim().toUpperCase(),
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

  Future<void> _placeOrder(GroceryCartState cart) async {
    if (_selectedAddressId == null) return;
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>('/grocery/orders', {
        'addressId': _selectedAddressId,
        'items': cart.items.map((i) => {'productId': i.productId, 'quantity': i.quantity}).toList(),
        'paymentMethod': _paymentMethod,
        if (_couponDiscount != null) 'couponCode': _couponCtrl.text.trim().toUpperCase(),
        if (_composedInstructions() != null) 'deliveryInstructions': _composedInstructions(),
        if (_tip > 0) 'tipAmount': _tip,
      });
      final orderId = res['id'] as String;
      cart.clear();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => GroceryOrderDetailScreen(orderId: orderId)));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<GroceryCartState>();
    final deliveryFee = cart.subtotal >= _freeDeliveryThreshold ? 0 : _groceryDeliveryFee;
    final taxAmount = cart.subtotal * (_taxRatePercent / 100);
    final total = (cart.subtotal + deliveryFee + taxAmount + _tip - (_couponDiscount ?? 0)).clamp(0, double.infinity).toDouble();

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _addresses == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const PhoneRequiredField(),
                const Text('Delivery address', style: TextStyle(fontWeight: FontWeight.w700)),
                ..._addresses!.map((a) => RadioListTile<String>(
                      value: a.id,
                      groupValue: _selectedAddressId,
                      onChanged: (v) => setState(() => _selectedAddressId = v),
                      title: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(a.full),
                      contentPadding: EdgeInsets.zero,
                    )),
                const SizedBox(height: 12),
                const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
                RadioListTile<String>(
                  value: 'WALLET',
                  groupValue: _paymentMethod,
                  onChanged: (v) => setState(() => _paymentMethod = v!),
                  title: Text('Glido Wallet · ₹${_walletBalance.toStringAsFixed(2)} available'),
                  contentPadding: EdgeInsets.zero,
                ),
                RadioListTile<String>(
                  value: 'COD',
                  groupValue: _paymentMethod,
                  onChanged: (v) => setState(() => _paymentMethod = v!),
                  title: const Text('Cash on delivery'),
                  contentPadding: EdgeInsets.zero,
                ),
                if (_paymentMethod == 'WALLET' && _walletBalance < total)
                  Text('Insufficient wallet balance.', style: TextStyle(color: context.colors.danger, fontSize: 12.5)),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Online (card/UPI) payment for Grocery is coming soon.', style: TextStyle(color: context.colors.muted, fontSize: 12.5)),
                ),
                const SizedBox(height: 16),
                const Text('Coupon', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _couponCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(hintText: 'Enter coupon code'),
                        onChanged: (_) => setState(() => _couponDiscount = null),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: _applyingCoupon ? null : () => _applyCoupon(cart.subtotal),
                      child: Text(_applyingCoupon ? '...' : 'Apply'),
                    ),
                  ],
                ),
                if (_couponError != null)
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text(_couponError!, style: TextStyle(color: context.colors.danger, fontSize: 12.5))),
                if (_couponDiscount != null)
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('₹${_couponDiscount!.toStringAsFixed(2)} discount applied', style: TextStyle(color: context.colors.success, fontSize: 12.5, fontWeight: FontWeight.w600))),
                const SizedBox(height: 16),
                const Text('Delivery instructions (optional)', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _kPresetInstructions.map((label) {
                    final active = _presetInstructions.contains(label);
                    return GestureDetector(
                      onTap: () => _togglePreset(label),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          color: active ? context.colors.groceryLight : Colors.transparent,
                          border: Border.all(color: active ? context.colors.grocery : context.colors.border, width: 1.2),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: active ? context.colors.groceryDark : context.colors.muted),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _instructionsCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(hintText: 'Anything else? (optional)'),
                ),
                const SizedBox(height: 16),
                const Text('Tip your delivery hero', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('100% goes to your delivery partner. Totally optional.', style: TextStyle(fontSize: 11.5, color: context.colors.muted)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    for (final amount in _kTipOptions)
                      GestureDetector(
                        onTap: () => setState(() {
                          _tip = _tip == amount ? 0 : amount.toDouble();
                          _customTipOpen = false;
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: _tip == amount ? context.colors.grocery : Colors.transparent,
                            border: Border.all(color: _tip == amount ? context.colors.grocery : context.colors.border, width: 1.6),
                          ),
                          child: Text(
                            '+₹$amount',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _tip == amount ? Colors.white : context.colors.ink),
                          ),
                        ),
                      ),
                    GestureDetector(
                      onTap: () => setState(() => _customTipOpen = !_customTipOpen),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          color: (_customTipOpen || (_tip > 0 && !_kTipOptions.contains(_tip.toInt()))) ? context.colors.grocery : Colors.transparent,
                          border: Border.all(color: (_customTipOpen || (_tip > 0 && !_kTipOptions.contains(_tip.toInt()))) ? context.colors.grocery : context.colors.border, width: 1.6),
                        ),
                        child: Text(
                          'Custom',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: (_customTipOpen || (_tip > 0 && !_kTipOptions.contains(_tip.toInt()))) ? Colors.white : context.colors.ink,
                          ),
                        ),
                      ),
                    ),
                    if (_tip > 0)
                      TextButton(
                        onPressed: () => setState(() {
                          _tip = 0;
                          _customTipCtrl.clear();
                          _customTipOpen = false;
                        }),
                        child: Text('Remove', style: TextStyle(color: context.colors.danger, fontWeight: FontWeight.w700, fontSize: 12.5)),
                      ),
                  ],
                ),
                if (_customTipOpen) ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: _customTipCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: 'Enter amount'),
                    onChanged: (v) {
                      final n = double.tryParse(v);
                      setState(() => _tip = (n != null && n > 0) ? n : 0);
                    },
                  ),
                ],
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Order summary', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _Row('Subtotal', cart.subtotal),
                        _Row('Delivery fee', deliveryFee.toDouble()),
                        _Row('Tax', taxAmount),
                        if (_tip > 0) _Row('Delivery tip', _tip),
                        if (_couponDiscount != null) _Row('Coupon discount', -_couponDiscount!),
                        const Divider(),
                        _Row('Total', total, bold: true),
                      ],
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: context.colors.danger)),
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: (_placing ||
                          context.watch<AuthState>().user?.phone == null ||
                          _selectedAddressId == null ||
                          (_paymentMethod == 'WALLET' && _walletBalance < total))
                      ? null
                      : () => _placeOrder(cart),
                  child: Text(_placing ? 'Placing order...' : 'Place order · ₹${total.toStringAsFixed(2)}'),
                ),
              ],
            ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final double value;
  final bool bold;
  const _Row(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(label, style: style), Text('₹${value.toStringAsFixed(2)}', style: style)]),
    );
  }
}
