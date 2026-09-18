import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/cab.dart';
import '../../state/auth_state.dart';
import '../../widgets/phone_required_field.dart';
import '../notifications/notification_bell.dart';
import 'ride_tracking_screen.dart';

const _defaultCenter = LatLng(18.945, 72.822); // Marine Drive, Mumbai

class _Point {
  final double lat;
  final double lng;
  final String address;
  _Point(this.lat, this.lng, this.address);
}

class _SearchResult {
  final String address;
  final double lat;
  final double lng;
  _SearchResult({required this.address, required this.lat, required this.lng});
  factory _SearchResult.fromJson(Map<String, dynamic> j) =>
      _SearchResult(address: j['address'], lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble());
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

  // Search — mirrors the website's pickup/drop address search (Rapido/Uber-style:
  // tap a field, type, pick a result, the next field auto-activates).
  bool _searchOpen = false;
  final _searchCtrl = TextEditingController();
  List<_SearchResult> _searchResults = [];
  bool _searching = false;
  Timer? _debounce;

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

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
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

  void _openSearch(bool forPickup) {
    setState(() {
      _settingPickup = forPickup;
      _searchOpen = true;
      _searchCtrl.text = '';
      _searchResults = [];
    });
  }

  void _onSearchChanged(String q) {
    _debounce?.cancel();
    if (q.trim().length < 3) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final res = await ApiClient.instance.get<List<dynamic>>('/geocode/search', query: {'q': q.trim()});
        if (!mounted) return;
        setState(() {
          _searchResults = res.map((r) => _SearchResult.fromJson(r)).toList();
          _searching = false;
        });
      } catch (_) {
        if (mounted) {
          setState(() {
            _searchResults = [];
            _searching = false;
          });
        }
      }
    });
  }

  void _selectSearchResult(_SearchResult r) {
    setState(() {
      final point = _Point(r.lat, r.lng, r.address);
      if (_settingPickup) {
        _pickup = point;
        _settingPickup = false; // auto-advance to drop, Rapido/Uber-style
        if (_drop == null) {
          _searchOpen = true;
          _searchCtrl.text = '';
          _searchResults = [];
          return;
        }
      } else {
        _drop = point;
      }
      _searchOpen = false;
      _searchCtrl.text = '';
      _searchResults = [];
    });
    if (_pickup != null && _drop != null) _estimateAll();
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
      // A plain push (not pushReplacement) — CabBookingScreen lives inside HomeShell's
      // IndexedStack, so replacing it here replaced the entire tab shell, leaving no way
      // back to Home/Food/Grocery once a ride was booked.
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: res['id'])));
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
      backgroundColor: GlidoColors.bg,
      appBar: AppBar(title: const Text('Book a ride'), actions: const [NotificationBellButton()]),
      body: Column(
        children: [
          _PlanCard(
            pickupLabel: _locating ? 'Finding your location...' : (_pickup?.address ?? 'Set pickup'),
            dropLabel: _drop?.address ?? 'Where to?',
            settingPickup: _settingPickup,
            onTapPickup: () => _openSearch(true),
            onTapDrop: () => _openSearch(false),
          ),
          if (_searchOpen) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                autofocus: true,
                onChanged: _onSearchChanged,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, size: 20),
                  hintText: 'Search ${_settingPickup ? 'pickup' : 'drop'} location...',
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setState(() {
                      _searchOpen = false;
                      _searchCtrl.text = '';
                      _searchResults = [];
                    }),
                  ),
                ),
              ),
            ),
            Expanded(
              child: _searching
                  ? const Center(child: CircularProgressIndicator())
                  : _searchResults.isEmpty
                      ? Center(
                          child: Text(
                            _searchCtrl.text.trim().length < 3 ? 'Type at least 3 characters' : 'No results found',
                            style: TextStyle(color: GlidoColors.muted),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          itemCount: _searchResults.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final r = _searchResults[i];
                            return ListTile(
                              leading: const Icon(Icons.location_on_outlined),
                              title: Text(r.address, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                              onTap: () => _selectSearchResult(r),
                            );
                          },
                        ),
            ),
          ] else
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  SizedBox(
                    height: 220,
                    child: FlutterMap(
                      options: MapOptions(initialCenter: center, initialZoom: 14, onTap: (_, point) => _onMapTap(point)),
                      children: [
                        TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'app.glido.customer'),
                        MarkerLayer(markers: [
                          if (_pickup != null)
                            Marker(point: LatLng(_pickup!.lat, _pickup!.lng), width: 28, height: 28, child: const Icon(Icons.circle, color: Color(0xFF00B368), size: 18)),
                          if (_drop != null)
                            Marker(point: LatLng(_drop!.lat, _drop!.lng), width: 28, height: 28, child: const Icon(Icons.square, color: Color(0xFFE40014), size: 16)),
                        ]),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
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
                        if (_pickup != null && _drop == null)
                          Text('Tap "Where to?" above to search a destination, or tap the map.', style: TextStyle(color: GlidoColors.muted, fontSize: 12.5)),
                        if (_pickup != null && _drop != null && _zoneError == null) ...[
                          const Text('Choose a ride', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(height: 8),
                          if (_rideTypes == null) const Center(child: CircularProgressIndicator()),
                          ...?_rideTypes?.map((rt) {
                            final est = _estimates[rt.id];
                            final selected = _selectedRideTypeId == rt.id;
                            return Card(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: BorderSide(color: selected ? GlidoColors.primary : Colors.transparent, width: 1.5),
                              ),
                              color: selected ? GlidoColors.primaryLight : Colors.white,
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                onTap: est == null ? null : () => setState(() => _selectedRideTypeId = rt.id),
                                leading: CircleAvatar(
                                  backgroundColor: GlidoColors.bg,
                                  child: const Icon(Icons.directions_car, color: Colors.black87),
                                ),
                                title: Text(rt.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text('${rt.capacity} seats${est != null ? ' · ${est['durationMin']} min' : _estimating ? ' · calculating...' : ''}'),
                                trailing: Text(est != null ? '₹${(est['estimatedFare'] as num).toStringAsFixed(0)}' : '—', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
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
                          const SizedBox(height: 12),
                          const PhoneRequiredField(),
                          Builder(builder: (context) {
                            final hasPhone = context.watch<AuthState>().user?.phone != null;
                            final label = _booking
                                ? 'Booking...'
                                : !hasPhone
                                    ? 'Add phone number to continue'
                                    : selectedEstimate == null
                                        ? 'Calculating fare...'
                                        : 'Book ride';
                            return ElevatedButton(
                              onPressed: (_booking || selectedEstimate == null || !hasPhone) ? null : _bookRide,
                              child: Text(label),
                            );
                          }),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Rapido/Uber-style pickup+drop plan card — two tappable rows that open a
/// live address search instead of relying only on tapping the map.
class _PlanCard extends StatelessWidget {
  final String pickupLabel;
  final String dropLabel;
  final bool settingPickup;
  final VoidCallback onTapPickup;
  final VoidCallback onTapDrop;

  const _PlanCard({
    required this.pickupLabel,
    required this.dropLabel,
    required this.settingPickup,
    required this.onTapPickup,
    required this.onTapDrop,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          children: [
            InkWell(
              onTap: onTapPickup,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  children: [
                    Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF00B368), shape: BoxShape.circle)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(pickupLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    ),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(left: 19),
              child: SizedBox(height: 10, child: VerticalDivider(width: 1)),
            ),
            InkWell(
              onTap: onTapDrop,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  children: [
                    Container(width: 10, height: 10, color: const Color(0xFFE40014)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(dropLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
