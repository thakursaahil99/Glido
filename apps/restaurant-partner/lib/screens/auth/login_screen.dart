import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../home/home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierCtrl = TextEditingController(text: 'partner@glido.app');
  final _passwordCtrl = TextEditingController(text: 'Partner@123');
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().login(_identifierCtrl.text.trim(), _passwordCtrl.text);
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeShell()), (route) => false);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not log in. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    height: 56,
                    width: 56,
                    decoration: BoxDecoration(gradient: GlidoGradients.primaryButton, borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.storefront, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 16),
                  RichText(
                    text: TextSpan(
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
                      children: [
                        TextSpan(text: 'G', style: TextStyle(color: GlidoColors.primary)),
                        TextSpan(text: 'lido', style: TextStyle(color: GlidoColors.ink)),
                        TextSpan(text: ' Partner', style: TextStyle(color: GlidoColors.muted)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('Manage your restaurant, menu and orders.', style: TextStyle(color: GlidoColors.muted)),
                  const SizedBox(height: 32),
                  TextField(controller: _identifierCtrl, decoration: const InputDecoration(labelText: 'Email')),
                  const SizedBox(height: 12),
                  TextField(controller: _passwordCtrl, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: GlidoColors.danger, fontSize: 13)),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(onPressed: _loading ? null : _submit, child: Text(_loading ? 'Signing in...' : 'Sign in')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
