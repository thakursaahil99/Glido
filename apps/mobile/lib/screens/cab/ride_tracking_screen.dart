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
  final _reviewCommentCtrl = TextEditingController();
  bool _submittingReview = false;
  Timer? _poll;

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

  Future<void> _submitReview() async {
    setState(() => _submittingReview = true);
    try {
      await ApiClient.instance.post('/cab/rides/${widget.rideId}/review', {
        'rating': _reviewRating,
        if (_reviewCommentCtrl.text.trim().isNotEmpty) 'comment': _reviewCommentCtrl.text.trim(),
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks for rating your ride!')));
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submittingReview = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Scaffold(appBar: AppBar(), body: ErrorStateView(message: _error!, onRetry: _load));
    if (_ride == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final ride = _ride!;
    final canCancel = ride.status == 'REQUESTED' || ride.status == 'DRIVER_ASSIGNED';
    final currentIndex = _rideSteps.indexOf(ride.status);

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
                  Polyline(points: [LatLng(ride.pickupLat, ride.pickupLng), LatLng(ride.dropLat, ride.dropLng)], color: GlidoColors.primary, strokeWidth: 3),
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
                Text(ride.rideType?.name ?? '', style: TextStyle(color: GlidoColors.muted)),
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
                        ? Row(children: [Icon(Icons.cancel, color: GlidoColors.danger), const SizedBox(width: 8), Text('Ride cancelled', style: TextStyle(color: GlidoColors.danger, fontWeight: FontWeight.w700))])
                        : Column(
                            children: [
                              for (var i = 0; i < _rideSteps.length; i++)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  child: Row(
                                    children: [
                                      Icon(i <= currentIndex ? Icons.check_circle : Icons.radio_button_unchecked, size: 18, color: i <= currentIndex ? GlidoColors.primary : GlidoColors.border),
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
                    style: OutlinedButton.styleFrom(foregroundColor: GlidoColors.danger, side: BorderSide(color: GlidoColors.danger)),
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
                        Text(ride.pickupAddress, style: TextStyle(color: GlidoColors.muted)),
                        const SizedBox(height: 4),
                        Text(ride.dropAddress, style: TextStyle(color: GlidoColors.muted)),
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
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Distance'), Text('${ride.distanceKm} km')]),
                        const Divider(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(ride.status == 'COMPLETED' ? 'Total fare' : 'Estimated fare', style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text('₹${(ride.finalFare ?? ride.estimatedFare).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
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
                                  color: GlidoColors.accent,
                                  size: 28,
                                ),
                              );
                            }),
                          ),
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
                                    color: GlidoColors.accent,
                                    size: 16,
                                  )),
                            ],
                          ),
                          if (ride.review!.comment != null && ride.review!.comment!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(ride.review!.comment!, style: TextStyle(color: GlidoColors.muted)),
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
