import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'api_client.dart';
import 'socket_client.dart';

/// Streams this rider's GPS position to the API while they're online, which is what
/// moves the scooter on customer / restaurant / admin tracking maps.
///
/// Each fix goes over the Socket.IO connection (`rider:location`) when it's up and
/// falls back to PATCH /delivery-partner/me/location when it isn't — the serverless
/// production API can't hold sockets, so in practice that's REST there. Both paths
/// land in the same server code (apps/api/src/tracking/tracking.service.ts).
///
/// Foreground only: Android/iOS pause this while the app is in the background.
class LocationTracker extends ChangeNotifier {
  LocationTracker._();
  static final LocationTracker instance = LocationTracker._();

  // Never send more often than this, however fast fixes arrive (API rate limit is
  // 100 req/min per IP); and re-send at least this often while standing still so
  // "updated Xs ago" on the customer's map doesn't go stale at a red light.
  static const _minInterval = Duration(seconds: 4);
  static const _heartbeat = Duration(seconds: 15);

  StreamSubscription<Position>? _sub;
  Timer? _heartbeatTimer;
  Position? _last;
  DateTime? _lastSentAt;
  bool _sending = false;

  String? error;
  DateTime? lastSentAt;

  bool get isActive => _sub != null;
  LatLng? get position => _last == null ? null : LatLng(_last!.latitude, _last!.longitude);
  double? get heading => _last == null ? null : _usableHeading(_last!);

  /// Starts sharing location. Returns false (with [error] set) if GPS is off or
  /// permission was refused — the rider can still work, the map just won't move.
  Future<bool> start() async {
    if (_sub != null) return true;
    error = null;
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        error = 'Turn on location (GPS) so customers can see you on the map.';
        notifyListeners();
        return false;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        error = 'Location permission is off — customers can\'t see you on the map.';
        notifyListeners();
        return false;
      }
    } catch (_) {
      error = 'Could not access location on this device.';
      notifyListeners();
      return false;
    }

    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10),
    ).listen(_onFix, onError: (_) {
      error = 'Lost GPS signal — retrying…';
      notifyListeners();
    });
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) {
      if (_last != null) _send(_last!, force: true);
    });
    notifyListeners();

    // The stream only emits after the first movement; send where we are right now.
    try {
      final now = await Geolocator.getCurrentPosition().timeout(const Duration(seconds: 8));
      _onFix(now);
    } catch (_) {}
    return true;
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    notifyListeners();
  }

  void _onFix(Position p) {
    _last = p;
    if (error != null) error = null;
    notifyListeners();
    _send(p);
  }

  /// GPS heading is meaningless when stationary (often reported as 0), so only
  /// pass it on while actually moving.
  double? _usableHeading(Position p) => p.speed > 1 && p.heading >= 0 && p.heading <= 360 ? p.heading : null;

  Future<void> _send(Position p, {bool force = false}) async {
    final now = DateTime.now();
    if (_sending) return;
    if (!force && _lastSentAt != null && now.difference(_lastSentAt!) < _minInterval) return;
    _sending = true;
    _lastSentAt = now;
    final heading = _usableHeading(p);
    final body = <String, dynamic>{'lat': p.latitude, 'lng': p.longitude, 'heading': ?heading};
    try {
      final socket = SocketClient.instance.socket;
      if (socket.connected) {
        socket.emit('rider:location', body);
      } else {
        await ApiClient.instance.patch('/delivery-partner/me/location', body);
      }
      lastSentAt = now;
      notifyListeners();
    } catch (_) {
      // Next fix or heartbeat retries; nothing useful to surface for one dropped fix.
    } finally {
      _sending = false;
    }
  }
}
