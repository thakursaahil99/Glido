import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/partner_profile.dart';
import '../../state/auth_state.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  PartnerProfile? _profile;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/delivery-partner/me');
      setState(() => _profile = PartnerProfile.fromJson(res));
    } catch (_) {
      // best-effort
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _profile == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: GlidoColors.primaryLight,
                          child: Text(_profile!.name.substring(0, 1).toUpperCase(), style: TextStyle(color: GlidoColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 18)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_profile!.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              Text(_profile!.phone, style: TextStyle(color: GlidoColors.muted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Row('Vehicle', '${_profile!.vehicleType}${_profile!.vehicleNumber != null ? ' · ${_profile!.vehicleNumber}' : ''}'),
                        _Row('Status', _profile!.status),
                        _Row('Rating', '★ ${_profile!.ratingAvg.toStringAsFixed(1)} (${_profile!.ratingCount})'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () async {
                    await context.read<AuthState>().logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
                    }
                  },
                  style: OutlinedButton.styleFrom(foregroundColor: GlidoColors.danger, side: BorderSide(color: GlidoColors.danger)),
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Log out'),
                ),
              ],
            ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: GlidoColors.muted)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
