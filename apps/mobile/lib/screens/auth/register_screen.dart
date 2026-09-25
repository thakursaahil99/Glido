import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../home/home_shell.dart';

/// Three-step signup: details (name, email, phone, password) -> email OTP ->
/// a "Welcome to Glido" success screen. The account is only created once the
/// OTP is verified (see AuthState.verifyRegistration).
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

enum _Step { details, otp, welcome }

class _RegisterScreenState extends State<RegisterScreen> {
  _Step _step = _Step.details;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  String? _validateDetails() {
    if (_nameCtrl.text.trim().length < 2) return 'Enter your full name.';
    final email = _emailCtrl.text.trim();
    if (!email.contains('@') || !email.contains('.')) return 'Enter a valid email address.';
    final phone = _phoneCtrl.text.trim();
    if (phone.length < 6) return 'Enter a valid mobile number.';
    if (_passwordCtrl.text.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  Future<void> _submitDetails() async {
    final validationError = _validateDetails();
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().requestRegistrationOtp(
            _nameCtrl.text.trim(),
            _emailCtrl.text.trim(),
            _phoneCtrl.text.trim(),
            _passwordCtrl.text,
          );
      if (!mounted) return;
      setState(() => _step = _Step.otp);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not send OTP. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitOtp() async {
    if (_otpCtrl.text.trim().length < 4) {
      setState(() => _error = 'Enter the code sent to your email.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().verifyRegistration(_emailCtrl.text.trim(), _otpCtrl.text.trim());
      if (!mounted) return;
      setState(() => _step = _Step.welcome);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not verify OTP. Check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().requestRegistrationOtp(
            _nameCtrl.text.trim(),
            _emailCtrl.text.trim(),
            _phoneCtrl.text.trim(),
            _passwordCtrl.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('A new code has been sent.')));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _finish() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeShell()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _step == _Step.welcome
          ? null
          : AppBar(title: Text(_step == _Step.details ? 'Create account' : 'Verify your email')),
      body: SafeArea(
        child: switch (_step) {
          _Step.details => _DetailsStep(
              nameCtrl: _nameCtrl,
              emailCtrl: _emailCtrl,
              phoneCtrl: _phoneCtrl,
              passwordCtrl: _passwordCtrl,
              loading: _loading,
              error: _error,
              onSubmit: _submitDetails,
            ),
          _Step.otp => _OtpStep(
              email: _emailCtrl.text.trim(),
              otpCtrl: _otpCtrl,
              loading: _loading,
              error: _error,
              onSubmit: _submitOtp,
              onResend: _resendOtp,
            ),
          _Step.welcome => _WelcomeStep(onContinue: _finish),
        },
      ),
    );
  }
}

class _DetailsStep extends StatelessWidget {
  final TextEditingController nameCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController phoneCtrl;
  final TextEditingController passwordCtrl;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;

  const _DetailsStep({
    required this.nameCtrl,
    required this.emailCtrl,
    required this.phoneCtrl,
    required this.passwordCtrl,
    required this.loading,
    required this.error,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full name')),
          const SizedBox(height: 12),
          TextField(
            controller: emailCtrl,
            decoration: const InputDecoration(labelText: 'Email address'),
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: phoneCtrl,
            decoration: const InputDecoration(labelText: 'Mobile number'),
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          TextField(controller: passwordCtrl, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(error!, style: TextStyle(color: context.colors.danger, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: loading ? null : onSubmit,
            child: Text(loading ? 'Sending code...' : 'Send verification code'),
          ),
        ],
      ),
    );
  }
}

class _OtpStep extends StatelessWidget {
  final String email;
  final TextEditingController otpCtrl;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;
  final VoidCallback onResend;

  const _OtpStep({
    required this.email,
    required this.otpCtrl,
    required this.loading,
    required this.error,
    required this.onSubmit,
    required this.onResend,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.mark_email_read_outlined, size: 48, color: context.colors.primary),
          const SizedBox(height: 12),
          Text(
            'We sent a 6-digit code to $email',
            style: TextStyle(color: context.colors.muted),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: otpCtrl,
            decoration: const InputDecoration(labelText: 'Enter OTP'),
            keyboardType: TextInputType.number,
            maxLength: 6,
          ),
          if (error != null) ...[
            const SizedBox(height: 4),
            Text(error!, style: TextStyle(color: context.colors.danger, fontSize: 13)),
          ],
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: loading ? null : onSubmit,
            child: Text(loading ? 'Verifying...' : 'Verify & create account'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: loading ? null : onResend,
            child: const Text("Didn't get the code? Resend"),
          ),
        ],
      ),
    );
  }
}

class _WelcomeStep extends StatelessWidget {
  final VoidCallback onContinue;
  const _WelcomeStep({required this.onContinue});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(gradient: GlidoGradients.primaryButton(context.colors), shape: BoxShape.circle),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 52),
            ),
            const SizedBox(height: 24),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
                children: [
                  TextSpan(text: 'Welcome to ', style: TextStyle(color: context.colors.ink)),
                  TextSpan(text: 'glid', style: TextStyle(color: context.colors.ink)),
                  TextSpan(text: 'o', style: TextStyle(color: context.colors.primary)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your account is ready. Order food, groceries and rides — all in one place.',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.colors.muted),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: onContinue,
              child: const Text('Start exploring'),
            ),
          ],
        ),
      ),
    );
  }
}
