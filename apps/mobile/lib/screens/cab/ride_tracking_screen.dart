import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/socket_client.dart';
import '../../core/theme.dart';
import '../../models/cab.dart';
import '../../widgets/error_state.dart';

const _rideSteps = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'ONGOING', 'COMPLETED'];
const _reviewTagOptions = ['Clean car', 'Polite & professional', 'Smooth driving', 'Followed route', 'Safe driving'];

class RideTrackingScreen extends StatefulWidget {
  final String rideId;
  const RideTrackingScreen({super.key, required this.rideId});

  @override
  State<RideTrackingScreen> createState() => _RideTrackingScreenState();
}

class _RideTrackingScreenState extends State<RideTrackingScreen> {
  Ride? _ride;
  String? _error;
  int _reviewRating = 5;
  final List<String> _reviewTags = [];
  final _reviewCommentCtrl = TextEditingController();
  bool _submittingReview = false;
  Timer? _poll;

  double _tipAmount = 0;
  bool _customTipOpen = false;
  final _customTipCtrl = TextEditingController();
  bool _submittingTip = false;

  @override
  void initState() {
    super.initState();
    _load();
    final socket = SocketClient.instance.socket;
    socket.emit('order:subscribe', widget.rideId);
    socket.on('order:update', _onUpdate);
    // Polling fallback — the live serverless API doesn't hold a persistent socket connection.
    _poll = Timer.periodic(const Duration(seconds: 6), (_) => _load());
  }

  @override
  void dispose() {
    SocketClient.instance.socket.off('order:update', _onUpdate);
    _poll?.cancel();
    _reviewCommentCtrl.dispose();
    _customTipCtrl.dispose();
    super.dispose();
  }

  void _onUpdate(dynamic payload) {
    if (payload is Map && (payload['rideId'] == widget.rideId || payload['orderId'] == widget.rideId)) _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/cab/rides/${widget.rideId}');
      setState(() => _ride = Ride.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this ride?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep ride')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, cancel')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiClient.instance.post('/cab/rides/${widget.rideId}/cancel', {});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _toggleReviewTag(String tag) {
    setState(() {
      if (_reviewTags.contains(tag)) {
        _reviewTags.remove(tag);
      } else {
        _reviewTags.add(tag);
      }
    });
  }

  Future<void> _submitReview() async {
    setState(() => _submittingReview = true);
    try {
      // Mirrors the website's composedInstructions-style pattern — there's no
      // structured tags field on the backend, so tags are comma-joined into
      // the free-text comment.
      final comment = [..._reviewTags, _reviewCommentCtrl.text.trim()].where((s) => s.isNotEmpty).join(', ');
      await ApiClient.instance.post('/cab/rides/${widget.rideId}/review', {
        'rating': _reviewRating,
        if (comment.isNotEmpty) 'comment': comment,
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks for rating your ride!')));
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submittingReview = false);
    }
  }

  Future<void> _submitTip(double amount) async {
    if (amount <= 0) return;
    setState(() => _submittingTip = true);
    try {
      await ApiClient.instance.post('/cab/rides/${widget.rideId}/tip', {'amount': amount});
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Thanks! ₹${amount.toStringAsFixed(0)} tip sent to your driver.')));
      }
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submittingTip = false);
    }
  }

  Widget _fareRow(String label, double value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: context.colors.muted, fontSize: 13)),
            Text('₹${value.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13)),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Scaffold(appBar: AppBar(), body: ErrorStateView(message: _error!, onRetry: _load));
    if (_ride == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final ride = _ride!;
    final canCancel = ride.status == 'REQUESTED' || ride.status == 'DRIVER_ASSIGNED';
    final currentIndex = _rideSteps.indexOf(ride.status);

    // Fare receipt breakdown — mirrors the website's ride/[id]/page.tsx.
    final baseFare = ride.rideType?.baseFare ?? 0;
    final distanceFare = (ride.rideType?.perKmFare ?? 0) * ride.distanceKm;
    final chargedFare = ride.finalFare ?? ride.estimatedFare;
    final otherChargesRaw = chargedFare - baseFare - distanceFare;
    final otherCharges = otherChargesRaw > 0 ? otherChargesRaw : 0.0;
    final totalFare = chargedFare + ride.tipAmount;

    return Scaffold(
      appBar: AppBar(title: Text('Ride #${ride.rideNumber}')),
      body: ListView(
        children: [
          SizedBox(
            height: 220,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(ride.pickupLat, ride.pickupLng),
                initialZoom: 13,
              ),
              children: [
                TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'app.glido.customer'),
                PolylineLayer(polylines: [
                  Polyline(points: [LatLng(ride.pickupLat, ride.pickupLng), LatLng(ride.dropLat, ride.dropLng)], color: context.colors.primary, strokeWidth: 3),
                ]),
                MarkerLayer(markers: [
                  Marker(point: LatLng(ride.pickupLat, ride.pickupLng), width: 26, height: 26, child: const Icon(Icons.circle, color: Color(0xFF00B368), size: 16)),
                  Marker(point: LatLng(ride.dropLat, ride.dropLng), width: 26, height: 26, child: const Icon(Icons.square, color: Color(0xFFE40014), size: 14)),
                  if (ride.driver?.currentLat != null && ride.driver?.currentLng != null)
                    Marker(point: LatLng(ride.driver!.currentLat!, ride.driver!.currentLng!), width: 30, height: 30, child: const Icon(Icons.local_taxi, color: Colors.black)),
                ]),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(ride.rideType?.name ?? '', style: TextStyle(color: context.colors.muted)),
                const SizedBox(height: 12),
                if (ride.driver != null)
                  Card(
                    child: ListTile(
                      title: Text(ride.driver!.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text('${ride.driver!.vehicleModel ?? ''} · ${ride.driver!.vehicleNumber}\n★ ${ride.driver!.ratingAvg.toStringAsFixed(1)}'),
                      isThreeLine: true,
                      trailing: IconButton(icon: const Icon(Icons.call), onPressed: () => launchUrl(Uri.parse('tel:${ride.driver!.phone}'))),
                    ),
                  ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: ride.status == 'CANCELLED'
                        ? Row(children: [Icon(Icons.cancel, color: context.colors.danger), const SizedBox(width: 8), Text('Ride cancelled', style: TextStyle(color: context.colors.danger, fontWeight: FontWeight.w700))])
                        : Column(
                            children: [
                              for (var i = 0; i < _rideSteps.length; i++)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  child: Row(
                                    children: [
                                      Icon(i <= currentIndex ? Icons.check_circle : Icons.radio_button_unchecked, size: 18, color: i <= currentIndex ? context.colors.primary : context.colors.border),
                                      const SizedBox(width: 10),
                                      Text(_rideSteps[i].replaceAll('_', ' '), style: TextStyle(fontWeight: i == currentIndex ? FontWeight.w800 : FontWeight.w500)),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                  ),
                ),
                if (canCancel) ...[
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _cancel,
                    style: OutlinedButton.styleFrom(foregroundColor: context.colors.danger, side: BorderSide(color: context.colors.danger)),
                    child: const Text('Cancel ride'),
                  ),
                ],
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Trip details', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        Text(ride.pickupAddress, style: TextStyle(color: context.colors.muted)),
                        const SizedBox(height: 4),
                        Text(ride.dropAddress, style: TextStyle(color: context.colors.muted)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(ride.status == 'COMPLETED' ? 'Fare receipt' : 'Fare', style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        _fareRow('Base fare', baseFare),
                        _fareRow('Distance & time (${ride.distanceKm} km)', distanceFare),
                        if (otherCharges > 0) _fareRow('Taxes & fees', otherCharges),
                        if (ride.tipAmount > 0) _fareRow('Driver tip', ride.tipAmount),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(ride.status == 'COMPLETED' ? 'Total paid' : 'Estimated fare', style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text('₹${totalFare.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          ride.paymentMethod == 'WALLET' ? 'Paid from Glido Wallet.' : 'Pay the driver in cash at the end of your ride.',
                          style: TextStyle(color: context.colors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
                if (ride.status == 'COMPLETED' && ride.driver != null && ride.tipAmount == 0) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Add a tip for ${ride.driver!.name}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text('100% goes to your driver. Totally optional.', style: TextStyle(color: context.colors.muted, fontSize: 12)),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final amount in [20, 30, 50])
                                ChoiceChip(
                                  label: Text(
                                    '+₹$amount',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: (!_customTipOpen && _tipAmount == amount.toDouble()) ? Colors.white : context.colors.ink,
                                    ),
                                  ),
                                  selected: !_customTipOpen && _tipAmount == amount.toDouble(),
                                  selectedColor: context.colors.cab,
                                  onSelected: (_) => setState(() {
                                    _tipAmount = amount.toDouble();
                                    _customTipOpen = false;
                                  }),
                                ),
                              ChoiceChip(
                                label: Text(
                                  'Custom',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: _customTipOpen ? Colors.white : context.colors.ink),
                                ),
                                selected: _customTipOpen,
                                selectedColor: context.colors.cab,
                                onSelected: (_) => setState(() => _customTipOpen = !_customTipOpen),
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
                                setState(() => _tipAmount = (n != null && n > 0) ? n : 0);
                              },
                            ),
                          ],
                          const SizedBox(height: 10),
                          ElevatedButton(
                            onPressed: (_submittingTip || _tipAmount <= 0) ? null : () => _submitTip(_tipAmount),
                            child: Text(
                              _submittingTip
                                  ? 'Sending...'
                                  : _tipAmount > 0
                                      ? 'Send ₹${_tipAmount.toStringAsFixed(0)} tip'
                                      : 'Choose a tip amount',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (ride.status == 'COMPLETED' && ride.driver != null && ride.review == null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Rate your driver', style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          Row(
                            children: List.generate(5, (i) {
                              final n = i + 1;
                              return IconButton(
                                padding: EdgeInsets.zero,
                                onPressed: () => setState(() => _reviewRating = n),
                                icon: Icon(
                                  n <= _reviewRating ? Icons.star : Icons.star_border,
                                  color: context.colors.accent,
                                  size: 28,
                                ),
                              );
                            }),
                          ),
                          if (_reviewRating >= 4) ...[
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _reviewTagOptions.map((tag) {
                                final active = _reviewTags.contains(tag);
                                return FilterChip(
                                  label: Text(tag, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                  selected: active,
                                  onSelected: (_) => _toggleReviewTag(tag),
                                  selectedColor: context.colors.cabLight,
                                  checkmarkColor: context.colors.cabDark,
                                  labelStyle: TextStyle(
                                    color: active ? context.colors.cabDark : context.colors.muted,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  side: BorderSide(color: active ? context.colors.cab : context.colors.border),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 8),
                          ],
                          TextField(
                            controller: _reviewCommentCtrl,
                            maxLines: 2,
                            decoration: InputDecoration(hintText: 'How was your ride with ${ride.driver!.name}? (optional)'),
                          ),
                          const SizedBox(height: 10),
                          ElevatedButton(
                            onPressed: _submittingReview ? null : _submitReview,
                            child: Text(_submittingReview ? 'Submitting...' : 'Submit rating'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (ride.review != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text('Your rating: ', style: TextStyle(fontWeight: FontWeight.w700)),
                              ...List.generate(5, (i) => Icon(
                                    i < ride.review!.rating ? Icons.star : Icons.star_border,
                                    color: context.colors.accent,
                                    size: 16,
                                  )),
                            ],
                          ),
                          if (ride.review!.comment != null && ride.review!.comment!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(ride.review!.comment!, style: TextStyle(color: context.colors.muted)),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
