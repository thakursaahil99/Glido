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

const _kPresetInstructions = ['Avoid calling', 'Leave at door', "Don't ring bell", 'Leave with guard'];
const _kTipPresets = [20.0, 30.0, 50.0];

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
  bool _noCutlery = false;
  final Set<String> _presetInstructions = {};
  double _tip = 0;
  bool _customTipOpen = false;
  final _customTipCtrl = TextEditingController();

  // Composes preset chips + cutlery opt-out + free text into the single
  // deliveryInstructions field already sent to POST /orders — mirrors the
  // web checkout's composedInstructions(). No structured field exists.
  String? get _composedInstructions {
    final parts = <String>[..._presetInstructions];
    if (_noCutlery) parts.add('No plastic cutlery, please');
    if (_instructionsCtrl.text.trim().isNotEmpty) parts.add(_instructionsCtrl.text.trim());
    return parts.isEmpty ? null : parts.join(', ');
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _instructionsCtrl.dispose();
    _couponCtrl.dispose();
    _customTipCtrl.dispose();
    super.dispose();
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
        if (_composedInstructions != null) 'deliveryInstructions': _composedInstructions,
        if (_couponDiscount != null) 'couponCode': _couponCtrl.text.trim().toUpperCase(),
        if (_tip > 0) 'tipAmount': _tip,
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
    final estimatedTotal = (cart.subtotal + taxAmount + _tip - (_couponDiscount ?? 0)).clamp(0, double.infinity).toDouble();

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
                  Text('Insufficient wallet balance — add money from your profile.', style: TextStyle(color: context.colors.danger, fontSize: 12.5)),
                // The web app also offers "Pay online" via Razorpay — that flow isn't
                // built into the mobile app yet, so this is here rather than silently
                // missing (matches the same disclosure on grocery checkout on web).
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Online (card/UPI) payment is coming soon to the app.', style: TextStyle(color: context.colors.muted, fontSize: 12.5)),
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
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text(_couponError!, style: TextStyle(color: context.colors.danger, fontSize: 12.5))),
                if (_couponDiscount != null)
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('₹${_couponDiscount!.toStringAsFixed(2)} discount applied', style: TextStyle(color: context.colors.success, fontSize: 12.5, fontWeight: FontWeight.w600))),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Opt out of plastic cutlery', style: TextStyle(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 2),
                              Text('Thank you for caring about the planet', style: TextStyle(fontSize: 11.5, color: context.colors.muted)),
                            ],
                          ),
                        ),
                        Switch(
                          value: _noCutlery,
                          onChanged: (v) => setState(() => _noCutlery = v),
                          activeThumbColor: context.colors.success,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Delivery instructions (optional)', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _kPresetInstructions.map((label) {
                    final active = _presetInstructions.contains(label);
                    return ChoiceChip(
                      label: Text(label),
                      selected: active,
                      onSelected: (v) => setState(() {
                        if (v) {
                          _presetInstructions.add(label);
                        } else {
                          _presetInstructions.remove(label);
                        }
                      }),
                      selectedColor: context.colors.primaryLight,
                      labelStyle: TextStyle(
                        color: active ? context.colors.primaryDark : context.colors.muted,
                        fontWeight: FontWeight.w600,
                        fontSize: 12.5,
                      ),
                      backgroundColor: context.colors.surface,
                      side: BorderSide(color: active ? context.colors.primary : context.colors.border),
                      showCheckmark: false,
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                TextField(controller: _instructionsCtrl, maxLines: 2, decoration: const InputDecoration(hintText: 'Anything else? (optional)')),
                const SizedBox(height: 16),
                const Text('Tip your delivery partner', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text('100% goes to your rider. Totally optional.', style: TextStyle(fontSize: 11.5, color: context.colors.muted)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    ..._kTipPresets.map((amount) {
                      final active = _tip == amount;
                      return ChoiceChip(
                        label: Text('+₹${amount.toStringAsFixed(0)}'),
                        selected: active,
                        onSelected: (_) => setState(() {
                          _tip = active ? 0 : amount;
                          _customTipOpen = false;
                          _customTipCtrl.clear();
                        }),
                        selectedColor: context.colors.primary,
                        labelStyle: TextStyle(color: active ? Colors.white : context.colors.ink, fontWeight: FontWeight.w700, fontSize: 13),
                        backgroundColor: context.colors.surface,
                        side: BorderSide(color: active ? context.colors.primary : context.colors.border, width: 1.4),
                        showCheckmark: false,
                      );
                    }),
                    ChoiceChip(
                      label: const Text('Custom'),
                      selected: _customTipOpen || (_tip > 0 && !_kTipPresets.contains(_tip)),
                      onSelected: (_) => setState(() => _customTipOpen = !_customTipOpen),
                      selectedColor: context.colors.primary,
                      labelStyle: TextStyle(
                        color: (_customTipOpen || (_tip > 0 && !_kTipPresets.contains(_tip))) ? Colors.white : context.colors.ink,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                      backgroundColor: context.colors.surface,
                      side: BorderSide(color: (_customTipOpen || (_tip > 0 && !_kTipPresets.contains(_tip))) ? context.colors.primary : context.colors.border, width: 1.4),
                      showCheckmark: false,
                    ),
                    if (_tip > 0)
                      TextButton(
                        onPressed: () => setState(() {
                          _tip = 0;
                          _customTipOpen = false;
                          _customTipCtrl.clear();
                        }),
                        child: Text('Remove', style: TextStyle(color: context.colors.danger, fontWeight: FontWeight.w600, fontSize: 12.5)),
                      ),
                  ],
                ),
                if (_customTipOpen) ...[
                  const SizedBox(height: 8),
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
                        _SummaryRow(label: 'Subtotal', value: cart.subtotal),
                        _SummaryRow(label: 'Tax (est.)', value: taxAmount),
                        if (_tip > 0) _SummaryRow(label: 'Delivery tip', value: _tip),
                        if (_couponDiscount != null) _SummaryRow(label: 'Coupon discount', value: -_couponDiscount!),
                        const Divider(),
                        _SummaryRow(label: 'Total (est.)', value: estimatedTotal, bold: true),
                        Text('Delivery & packaging fees are added by the restaurant at checkout.',
                            style: TextStyle(fontSize: 11, color: context.colors.muted)),
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
