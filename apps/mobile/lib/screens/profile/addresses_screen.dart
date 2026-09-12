import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/user.dart';
import '../../widgets/error_state.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<Address>? _addresses;
  String? _error;

  final _labelCtrl = TextEditingController(text: 'Home');
  final _line1Ctrl = TextEditingController();
  final _line2Ctrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<List<dynamic>>('/users/me/addresses');
      setState(() => _addresses = res.map((a) => Address.fromJson(a)).toList());
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _addAddress() async {
    if (_line1Ctrl.text.trim().isEmpty) return;
    try {
      await ApiClient.instance.post('/users/me/addresses', {
        'label': _labelCtrl.text.trim(),
        'line1': _line1Ctrl.text.trim(),
        'line2': _line2Ctrl.text.trim(),
        'pincode': _pincodeCtrl.text.trim(),
        'isDefault': true,
      });
      _labelCtrl.text = 'Home';
      _line1Ctrl.clear();
      _line2Ctrl.clear();
      _pincodeCtrl.clear();
      if (mounted) Navigator.of(context).pop();
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _removeAddress(String id) async {
    try {
      await ApiClient.instance.delete('/users/me/addresses/$id');
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add address', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 12),
            TextField(controller: _labelCtrl, decoration: const InputDecoration(labelText: 'Label (e.g. Home, Work)')),
            const SizedBox(height: 8),
            TextField(controller: _line1Ctrl, decoration: const InputDecoration(labelText: 'Address line 1')),
            const SizedBox(height: 8),
            TextField(controller: _line2Ctrl, decoration: const InputDecoration(labelText: 'Address line 2 (optional)')),
            const SizedBox(height: 8),
            TextField(controller: _pincodeCtrl, decoration: const InputDecoration(labelText: 'Pincode')),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _addAddress, child: const Text('Save address')),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved addresses'),
        actions: [IconButton(onPressed: _showAddSheet, icon: const Icon(Icons.add))],
      ),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : _addresses == null
              ? const Center(child: CircularProgressIndicator())
              : _addresses!.isEmpty
                  ? const Center(child: Text('No saved addresses yet.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _addresses!.length,
                      itemBuilder: (context, i) {
                        final a = _addresses![i];
                        return Card(
                          child: ListTile(
                            title: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text('${a.full}${a.pincode != null ? ' ${a.pincode}' : ''}'),
                            trailing: IconButton(
                              icon: Icon(Icons.delete_outline, color: GlidoColors.danger),
                              onPressed: () => _removeAddress(a.id),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
