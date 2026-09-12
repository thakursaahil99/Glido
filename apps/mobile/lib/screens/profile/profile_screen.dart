import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../auth/login_screen.dart';
import '../cab/ride_history_screen.dart';
import '../grocery/grocery_orders_screen.dart';
import '../orders/orders_list_screen.dart';
import 'addresses_screen.dart';
import 'wallet_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  double? _walletBalance;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/wallet/me');
      setState(() => _walletBalance = (res['balance'] as num).toDouble());
    } catch (_) {
      // best-effort
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: GlidoColors.primaryLight,
                    child: Text(
                      (user?.name ?? user?.email ?? 'G').substring(0, 1).toUpperCase(),
                      style: TextStyle(color: GlidoColors.primaryDark, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user?.name ?? 'Glido customer', style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text(user?.email ?? user?.phone ?? '', style: TextStyle(color: GlidoColors.muted, fontSize: 12.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const WalletScreen())).then((_) => _loadWallet()),
              leading: Icon(Icons.account_balance_wallet_outlined, color: GlidoColors.primary),
              title: const Text('Glido Wallet'),
              subtitle: Text(_walletBalance != null ? '₹${_walletBalance!.toStringAsFixed(2)} available' : 'Loading...'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AddressesScreen())),
              leading: Icon(Icons.location_on_outlined, color: GlidoColors.primary),
              title: const Text('Saved addresses'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Your orders', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OrdersListScreen())),
              leading: Icon(Icons.restaurant_menu_outlined, color: GlidoColors.primary),
              title: const Text('Food orders'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GroceryOrdersScreen())),
              leading: Icon(Icons.shopping_cart_outlined, color: GlidoColors.primary),
              title: const Text('Grocery orders'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RideHistoryScreen())),
              leading: Icon(Icons.local_taxi_outlined, color: GlidoColors.primary),
              title: const Text('Ride history'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () async {
              await context.read<AuthState>().logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
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
