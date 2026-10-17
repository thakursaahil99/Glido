import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

// OpenStreetMap + flutter_map live delivery map — no API key, no billing.
// Same widget in the customer, delivery and restaurant-partner apps; mirrors
// apps/web/src/components/live-tracking-map.tsx.

const _restaurantColor = Color(0xFF1F2937);
const _dropColor = Color(0xFF0EA36C);

class TrackingMap extends StatefulWidget {
  final LatLng? restaurant;
  final LatLng? drop;
  final LatLng? rider;
  final double? riderHeading;

  /// After pickup the route is rider → customer; before, rider → restaurant → customer.
  final bool pickedUp;
  final Color riderColor;
  final String userAgentPackageName;
  final double height;

  /// Widget tests have no network; OSM tile requests there fail the test.
  final bool showTiles;

  const TrackingMap({
    super.key,
    required this.restaurant,
    required this.drop,
    required this.rider,
    this.riderHeading,
    required this.pickedUp,
    required this.riderColor,
    required this.userAgentPackageName,
    this.height = 260,
    this.showTiles = true,
  });

  @override
  State<TrackingMap> createState() => _TrackingMapState();
}

class _TrackingMapState extends State<TrackingMap> with SingleTickerProviderStateMixin {
  final _map = MapController();
  late final AnimationController _glide = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));
  LatLng? _from;
  LatLng? _shownRider;
  bool _userMoved = false;
  bool _ready = false;

  List<LatLng> get _points => [widget.restaurant, widget.drop, widget.rider].whereType<LatLng>().toList();

  @override
  void initState() {
    super.initState();
    _shownRider = widget.rider;
    _glide.addListener(() {
      final to = widget.rider;
      if (_from == null || to == null) return;
      final t = Curves.easeInOut.transform(_glide.value);
      setState(() => _shownRider = LatLng(
            _from!.latitude + (to.latitude - _from!.latitude) * t,
            _from!.longitude + (to.longitude - _from!.longitude) * t,
          ));
    });
  }

  @override
  void didUpdateWidget(TrackingMap old) {
    super.didUpdateWidget(old);
    final presenceChanged = (old.restaurant == null) != (widget.restaurant == null) ||
        (old.drop == null) != (widget.drop == null) ||
        (old.rider == null) != (widget.rider == null);
    if (widget.rider != old.rider) {
      if (_shownRider == null || widget.rider == null) {
        _shownRider = widget.rider;
      } else {
        _from = _shownRider;
        _glide.forward(from: 0);
        // Follow the rider unless the user has panned away to look at something.
        if (_ready && !_userMoved && !_map.camera.visibleBounds.contains(widget.rider!)) {
          _map.move(widget.rider!, _map.camera.zoom);
        }
      }
    }
    if (presenceChanged) WidgetsBinding.instance.addPostFrameCallback((_) => _fitAll());
  }

  @override
  void dispose() {
    _glide.dispose();
    super.dispose();
  }

  void _fitAll() {
    if (!_ready || _points.isEmpty) return;
    _userMoved = false;
    if (_points.length == 1) {
      _map.move(_points.first, 15);
    } else {
      _map.fitCamera(CameraFit.coordinates(coordinates: _points, padding: const EdgeInsets.all(48), maxZoom: 16));
    }
  }

  @override
  Widget build(BuildContext context) {
    final pts = _points;
    final rider = _shownRider;
    final lines = <Polyline>[];
    if (widget.pickedUp) {
      final from = rider ?? widget.restaurant;
      if (from != null && widget.drop != null) {
        lines.add(Polyline(points: [from, widget.drop!], color: widget.riderColor, strokeWidth: 4, pattern: StrokePattern.dashed(segments: const [10, 8])));
      }
    } else {
      if (rider != null && widget.restaurant != null) {
        lines.add(Polyline(points: [rider, widget.restaurant!], color: widget.riderColor, strokeWidth: 4, pattern: StrokePattern.dashed(segments: const [10, 8])));
      }
      if (widget.restaurant != null && widget.drop != null) {
        lines.add(Polyline(points: [widget.restaurant!, widget.drop!], color: Colors.grey, strokeWidth: 3, pattern: const StrokePattern.dotted()));
      }
    }

    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: pts.isNotEmpty ? pts.first : const LatLng(20.5937, 78.9629),
              initialZoom: 14,
              initialCameraFit: pts.length > 1
                  ? CameraFit.coordinates(coordinates: pts, padding: const EdgeInsets.all(48), maxZoom: 16)
                  : null,
              onMapReady: () => _ready = true,
              onPositionChanged: (_, hasGesture) {
                if (hasGesture) _userMoved = true;
              },
            ),
            children: [
              if (widget.showTiles) TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: widget.userAgentPackageName),
              PolylineLayer(polylines: lines),
              MarkerLayer(markers: [
                if (widget.restaurant != null)
                  Marker(point: widget.restaurant!, width: 36, height: 36, child: const _Pin(color: _restaurantColor, icon: Icons.storefront)),
                if (widget.drop != null) Marker(point: widget.drop!, width: 36, height: 36, child: const _Pin(color: _dropColor, icon: Icons.home_rounded)),
                if (rider != null)
                  Marker(point: rider, width: 52, height: 52, child: _RiderPin(color: widget.riderColor, heading: widget.riderHeading)),
              ]),
              const RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]),
            ],
          ),
          Positioned(
            right: 10,
            bottom: 34,
            child: Material(
              color: Colors.white,
              shape: const CircleBorder(),
              elevation: 3,
              child: IconButton(
                icon: const Icon(Icons.my_location, size: 20, color: Colors.black87),
                tooltip: 'Re-centre map',
                onPressed: _fitAll,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Pin extends StatelessWidget {
  final Color color;
  final IconData icon;
  const _Pin({required this.color, required this.icon});

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 2))],
        ),
        child: Icon(icon, color: Colors.white, size: 17),
      );
}

/// Scooter bubble with a pulsing halo and, when moving, a wedge pointing the way.
class _RiderPin extends StatefulWidget {
  final Color color;
  final double? heading;
  const _RiderPin({required this.color, this.heading});

  @override
  State<_RiderPin> createState() => _RiderPinState();
}

class _RiderPinState extends State<_RiderPin> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, child) => Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 30 + 22 * _pulse.value,
            height: 30 + 22 * _pulse.value,
            decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color.withValues(alpha: 0.4 * (1 - _pulse.value))),
          ),
          child!,
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (widget.heading != null)
            Transform.rotate(
              angle: widget.heading! * math.pi / 180,
              child: SizedBox(
                width: 46,
                height: 46,
                child: Align(alignment: Alignment.topCenter, child: Icon(Icons.navigation, size: 14, color: widget.color)),
              ),
            ),
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: widget.color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 8, offset: Offset(0, 2))],
            ),
            child: const Icon(Icons.delivery_dining, color: Colors.white, size: 19),
          ),
        ],
      ),
    );
  }
}
