import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/cab.dart';
import '../notifications/notification_bell.dart';
import 'ride_tracking_screen.dart';

const _defaultCenter = LatLng(18.945, 72.822); // Marine Drive, Mumbai

class _Point {
  final double lat;
  final double lng;
  final String address;
  _Point(this.lat, this.lng, this.address);
}

class CabBookingScreen extends StatefulWidget {
  const CabBookingScreen({super.key});

  @override
  State<CabBookingScreen> createState() => _CabBookingScreenState();
}

class _CabBookingScreenState extends State<CabBookingScreen> {
  _Point? _pickup;
  _Point? _drop;
  bool _settingPickup = true;
  bool _locating = true;

  List<RideType>? _rideTypes;
  String? _selectedRideTypeId;
  final Map<String, Map<String, dynamic>> _estimates = {};
  bool _estimating = false;
  String? _zoneError;
  String _paymentMethod = 'COD';
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.get<List<dynamic>>('/cab/ride-types').then((res) {
      if (!mounted) return;
      final types = res.map((r) => RideType.fromJson(r)).toList();
      setState(() {
        _rideTypes = types;
        if (types.isNotEmpty) _selectedRideTypeId = types.first.id;
      });
    }).catchError((_) {
      if (mounted) setState(() => _rideTypes = []);
    });
    _locate();
  }

  Future<void> _locate() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw Exception('disabled');
      final pos = await Geolocator.getCurrentPosition().timeout(const Duration(seconds: 6));
      final address = await _reverseGeocode(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() {
        _pickup = _Point(pos.latitude, pos.longitude, address);
        _locating = false;
        _settingPickup = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _pickup = _Point(_defaultCenter.latitude, _defaultCenter.longitude, 'Marine Drive, Mumbai');
        _locating = false;
        _settingPickup = false;
      });
    }
  }

  Future<String> _reverseGeocode(double lat, double lng) async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/geocode/reverse', query: {'lat': lat, 'lng': lng});
      return res['address'] ?? '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
    } catch (_) {
      return '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
    }
  }

  Future<void> _onMapTap(LatLng point) async {
    final address = await _reverseGeocode(point.latitude, point.longitude);
    setState(() {
      if (_settingPickup) {
        _pickup = _Point(point.latitude, point.longitude, address);
      } else {
        _drop = _Point(point.latitude, point.longitude, address);
      }
    });
    if (_pickup != null && _drop != null) _estimateAll();
  }

  Future<void> _estimateAll() async {
    if (_pickup == null || _drop == null || _rideTypes == null || _rideTypes!.isEmpty) return;
    setState(() {
      _estimating = true;
      _zoneError = null;
      _estimates.clear();
    });
    String? firstError;
    for (final rt in _rideTypes!) {
      try {
        final res = await ApiClient.instance.post<Map<String, dynamic>>('/cab/rides/estimate', {
          'rideTypeId': rt.id,
          'pickupLat': _pickup!.lat,
          'pickupLng': _pickup!.lng,
          'dropLat': _drop!.lat,
          'dropLng': _drop!.lng,
        });
        _estimates[rt.id] = res;
      } on ApiException catch (e) {
        firstError ??= e.message;
      }
    }
    if (mounted) {
      setState(() {
        _estimating = false;
        if (_estimates.isEmpty && firstError != null) _zoneError = firstError;
      });
    }
  }

  Future<void> _bookRide() async {
    if (_pickup == null || _drop == null || _selectedRideTypeId == null) return;
    setState(() => _booking = true);
    try {
      final res = await ApiClient.instance.post<Map<String, dynamic>>('/cab/rides', {
        'rideTypeId': _selectedRideTypeId,
        'pickupAddress': _pickup!.address,
        'pickupLat': _pickup!.lat,
        'pickupLng': _pickup!.lng,
        'dropAddress': _drop!.address,
        'dropLat': _drop!.lat,
        'dropLng': _drop!.lng,
        'paymentMethod': _paymentMethod,
      });
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: res['id'])));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final center = _drop != null
        ? LatLng(_drop!.lat, _drop!.lng)
        : _pickup != null
            ? LatLng(_pickup!.lat, _pickup!.lng)
            : _defaultCenter;

    final selectedEstimate = _selectedRideTypeId != null ? _estimates[_selectedRideTypeId] : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Book a ride'), actions: const [NotificationBellButton()]),
      body: Column(
        children: [
          SizedBox(
            height: 260,
            child: Stack(
              children: [
                FlutterMap(
                  options: MapOptions(initialCenter: center, initialZoom: 14, onTap: (_, point) => _onMapTap(point)),
                  children: [
                    TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'app.glido.customer'),
                    MarkerLayer(markers: [
                      if (_pickup != null)
                        Marker(point: LatLng(_pickup!.lat, _pickup!.lng), width: 28, height: 28, child: const Icon(Icons.circle, color: Color(0xFF0EA36C), size: 18)),
                      if (_drop != null)
                        Marker(point: LatLng(_drop!.lat, _drop!.lng), width: 28, height: 28, child: const Icon(Icons.square, color: Color(0xFFE40014), size: 16)),
                    ]),
                  ],
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  right: 8,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        _locating ? 'Finding your location...' : 'Tap the map to set your ${_settingPickup ? 'pickup' : 'drop'} point',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _LocationTile(
                  color: const Color(0xFF0EA36C),
                  label: 'Pickup',
                  value: _pickup?.address ?? 'Setting your location...',
                  selected: _settingPickup,
                  onTap: () => setState(() => _settingPickup = true),
                ),
                const SizedBox(height: 8),
                _LocationTile(
                  color: const Color(0xFFE40014),
                  label: 'Drop',
                  value: _drop?.address ?? 'Tap the map to set your destination',
                  selected: !_settingPickup,
                  onTap: () => setState(() => _settingPickup = false),
                ),
                const SizedBox(height: 16),
                if (_pickup != null && _drop != null && _zoneError != null)
                  Card(
                    color: GlidoColors.dangerLight,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Not serviceable yet', style: TextStyle(color: GlidoColors.danger, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(_zoneError!, style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                if (_pickup != null && _drop != null && _zoneError == null) ...[
                  const Text('Choose a ride', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  if (_rideTypes == null) const Center(child: CircularProgressIndicator()),
                  ...?_rideTypes?.map((rt) {
                    final est = _estimates[rt.id];
                    final selected = _selectedRideTypeId == rt.id;
                    return Card(
                      color: selected ? GlidoColors.primaryLight : null,
                      child: ListTile(
                        onTap: est == null ? null : () => setState(() => _selectedRideTypeId = rt.id),
                        leading: const Icon(Icons.directions_car),
                        title: Text(rt.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('${rt.capacity} seats${est != null ? ' · ${est['durationMin']} min' : _estimating ? ' · calculating...' : ''}'),
                        trailing: Text(est != null ? '₹${(est['estimatedFare'] as num).toStringAsFixed(0)}' : '—', style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Cash to driver'),
                          selected: _paymentMethod == 'COD',
                          onSelected: (_) => setState(() => _paymentMethod = 'COD'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Wallet'),
                          selected: _paymentMethod == 'WALLET',
                          onSelected: (_) => setState(() => _paymentMethod = 'WALLET'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: (_booking || selectedEstimate == null) ? null : _bookRide,
                    child: Text(_booking ? 'Booking...' : 'Book ride'),
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

class _LocationTile extends StatelessWidget {
  final Color color;
  final String label;
  final String value;
  final bool selected;
  final VoidCallback onTap;

  const _LocationTile({required this.color, required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: selected ? GlidoColors.primary : GlidoColors.border),
          borderRadius: BorderRadius.circular(12),
          color: selected ? GlidoColors.primaryLight : Colors.white,
        ),
        child: Row(
          children: [
            Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(fontSize: 11, color: GlidoColors.muted)),
                  Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
