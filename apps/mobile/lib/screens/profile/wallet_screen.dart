import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class WalletTransaction {
  final String type;
  final double amount;
  final String reason;
  final DateTime createdAt;

  WalletTransaction({required this.type, required this.amount, required this.reason, required this.createdAt});

  factory WalletTransaction.fromJson(Map<String, dynamic> json) => WalletTransaction(
        type: json['type'],
        amount: (json['amount'] as num).toDouble(),
        reason: json['reason'],
        createdAt: DateTime.parse(json['createdAt']),
      );
}

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  double? _balance;
  List<WalletTransaction>? _transactions;
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final summary = await ApiClient.instance.get<Map<String, dynamic>>('/wallet/me');
      final txRes = await ApiClient.instance.get<Map<String, dynamic>>('/wallet/me/transactions', query: {'pageSize': 30});
      setState(() {
        _balance = (summary['balance'] as num).toDouble();
        _transactions = (txRes['items'] as List<dynamic>).map((t) => WalletTransaction.fromJson(t)).toList();
      });
    } catch (_) {
      // best-effort
    }
  }

  Future<void> _addMoney(double amount) async {
    setState(() => _adding = true);
    try {
      await ApiClient.instance.post('/wallet/me/topup', {'amount': amount});
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('₹${amount.toStringAsFixed(2)} added to your wallet')));
      }
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Glido Wallet')),
      body: _balance == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [GlidoColors.primary, GlidoColors.primaryDark]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Available balance', style: TextStyle(color: Colors.white70)),
                      const SizedBox(height: 4),
                      Text('₹${_balance!.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Add money (demo — instant, no real charge)', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [100, 500, 1000, 2000]
                      .map((amt) => OutlinedButton(
                            onPressed: _adding ? null : () => _addMoney(amt.toDouble()),
                            child: Text('₹$amt'),
                          ))
                      .toList(),
                ),
                const SizedBox(height: 20),
                const Text('Transaction history', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (_transactions == null || _transactions!.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('No transactions yet.'))
                else
                  ..._transactions!.map((t) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: t.type == 'CREDIT' ? GlidoColors.successLight : GlidoColors.dangerLight,
                          child: Icon(
                            t.type == 'CREDIT' ? Icons.arrow_downward : Icons.arrow_upward,
                            size: 16,
                            color: t.type == 'CREDIT' ? GlidoColors.success : GlidoColors.danger,
                          ),
                        ),
                        title: Text(t.reason, style: const TextStyle(fontSize: 13.5)),
                        subtitle: Text('${t.createdAt.toLocal()}'.split('.').first, style: const TextStyle(fontSize: 11)),
                        trailing: Text(
                          '${t.type == 'CREDIT' ? '+' : '-'}₹${t.amount.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: t.type == 'CREDIT' ? GlidoColors.success : GlidoColors.danger,
                          ),
                        ),
                      )),
              ],
            ),
    );
  }
}
