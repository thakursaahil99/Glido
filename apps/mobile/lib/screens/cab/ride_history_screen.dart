import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../models/cab.dart';
import '../../widgets/error_state.dart';
import 'ride_tracking_screen.dart';

class RideHistoryScreen extends StatefulWidget {
  const RideHistoryScreen({super.key});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen> {
  List<Ride>? _rides;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/cab/rides/me');
      setState(() => _rides = (res['items'] as List<dynamic>).map((r) => Ride.fromJson(r)).toList());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ride history')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _error != null
            ? ErrorStateView(message: _error!, onRetry: _load)
            : _rides == null
                ? const Center(child: CircularProgressIndicator())
                : _rides!.isEmpty
                    ? ListView(children: const [Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No rides yet.')))])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _rides!.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, i) {
                          final r = _rides![i];
                          return Card(
                            child: ListTile(
                              leading: const Icon(Icons.local_taxi),
                              title: Text('${r.rideType?.name ?? 'Ride'} · #${r.rideNumber}', style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text('${r.pickupAddress} → ${r.dropAddress}', maxLines: 1, overflow: TextOverflow.ellipsis),
                              trailing: Text('₹${(r.finalFare ?? r.estimatedFare).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => RideTrackingScreen(rideId: r.id))),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
