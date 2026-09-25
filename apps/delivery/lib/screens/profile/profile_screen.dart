import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/partner_profile.dart';
import '../../state/auth_state.dart';
import '../../state/theme_state.dart';
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
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(20), boxShadow: glidoCardShadow()),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: context.colors.primaryLight,
                        child: Text(_profile!.name.substring(0, 1).toUpperCase(), style: TextStyle(color: context.colors.primaryDark, fontWeight: FontWeight.w800, fontSize: 20)),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_profile!.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                            const SizedBox(height: 2),
                            Text(_profile!.phone, style: TextStyle(color: context.colors.muted, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
                  decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(18), boxShadow: glidoCardShadow()),
                  child: Column(
                    children: [
                      _Row('Vehicle', '${_profile!.vehicleType}${_profile!.vehicleNumber != null ? ' · ${_profile!.vehicleNumber}' : ''}'),
                      Divider(height: 1, color: context.colors.border),
                      _Row('Status', _profile!.status),
                      Divider(height: 1, color: context.colors.border),
                      _Row('Rating', '★ ${_profile!.ratingAvg.toStringAsFixed(1)} (${_profile!.ratingCount})'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(18), boxShadow: glidoCardShadow()),
                  child: SwitchListTile(
                    value: context.watch<ThemeState>().isDark,
                    onChanged: (_) => context.read<ThemeState>().toggle(),
                    secondary: Icon(
                      context.watch<ThemeState>().isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                      color: context.colors.primary,
                    ),
                    title: const Text('Dark mode', style: TextStyle(fontWeight: FontWeight.w600)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await context.read<AuthState>().logout();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
                      }
                    },
                    style: OutlinedButton.styleFrom(foregroundColor: context.colors.danger, side: BorderSide(color: context.colors.danger)),
                    icon: const Icon(Icons.logout, size: 18),
                    label: const Text('Log out'),
                  ),
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
          Text(label, style: TextStyle(color: context.colors.muted)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
