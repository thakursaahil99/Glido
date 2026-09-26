import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';

/// Two-step "forgot password" flow, mirroring the web login page's forgot/reset
/// modes: request a code sent to email or phone, then submit the code with a
/// new password. Doesn't log the user in — they go back to LoginScreen after.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

enum _Step { request, reset }

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  _Step _step = _Step.request;

  final _identifierCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _codeCtrl.dispose();
    _newPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    if (_identifierCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Enter your email or phone.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().requestPasswordReset(_identifierCtrl.text.trim());
      if (!mounted) return;
      setState(() => _step = _Step.reset);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not send reset code. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    if (_codeCtrl.text.trim().isEmpty || _newPasswordCtrl.text.length < 8) {
      setState(() => _error = 'Enter the code and a password of at least 8 characters.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().resetPassword(
            _identifierCtrl.text.trim(),
            _codeCtrl.text.trim(),
            _newPasswordCtrl.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated — please log in.')));
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not reset password. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_step == _Step.request ? 'Reset password' : 'Enter reset code')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _step == _Step.request
                ? [
                    Text(
                      "Enter the email or phone on your account — we'll send a reset code.",
                      style: TextStyle(color: context.colors.muted),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _identifierCtrl,
                      decoration: const InputDecoration(labelText: 'Email or phone'),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: TextStyle(color: context.colors.danger, fontSize: 13)),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _loading ? null : _requestCode,
                      child: Text(_loading ? 'Sending...' : 'Send reset code'),
                    ),
                  ]
                : [
                    Text(
                      'Check ${_identifierCtrl.text.trim()} for the code, then set a new password.',
                      style: TextStyle(color: context.colors.muted),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _codeCtrl,
                      decoration: const InputDecoration(labelText: 'Reset code'),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _newPasswordCtrl,
                      decoration: const InputDecoration(labelText: 'New password'),
                      obscureText: true,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: TextStyle(color: context.colors.danger, fontSize: 13)),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _loading ? null : _resetPassword,
                      child: Text(_loading ? 'Resetting...' : 'Reset password'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _loading ? null : () => setState(() => _step = _Step.request),
                      child: const Text('Back'),
                    ),
                  ],
          ),
        ),
      ),
    );
  }
}
