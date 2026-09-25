import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/theme.dart';
import '../state/auth_state.dart';

/// Shown on checkout/booking screens when the signed-in user has no phone on file yet —
/// a phone number is required before placing an order or booking a ride, but doesn't need OTP.
class PhoneRequiredField extends StatefulWidget {
  const PhoneRequiredField({super.key});

  @override
  State<PhoneRequiredField> createState() => _PhoneRequiredFieldState();
}

class _PhoneRequiredFieldState extends State<PhoneRequiredField> {
  final _controller = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_controller.text.trim().isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiClient.instance.patch('/users/me', {'phone': _controller.text.trim()});
      if (mounted) await context.read<AuthState>().refreshUser();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    if (user == null || user.phone != null) return const SizedBox.shrink();

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: context.colors.primary, width: 1.5)),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [Icon(Icons.phone, size: 18), SizedBox(width: 6), Text('Phone number required', style: TextStyle(fontWeight: FontWeight.w700))],
            ),
            const SizedBox(height: 4),
            Text('We need a phone number on file so your delivery partner or driver can reach you.', style: TextStyle(fontSize: 12, color: context.colors.muted)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(hintText: 'e.g. +919800000000', isDense: true),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Saving...' : 'Save')),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 6),
              Text(_error!, style: TextStyle(color: context.colors.danger, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}
