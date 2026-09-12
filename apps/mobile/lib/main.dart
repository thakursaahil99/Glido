import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_shell.dart';
import 'state/auth_state.dart';
import 'state/cart_state.dart';
import 'state/grocery_cart_state.dart';

void main() {
  runApp(const GlidoApp());
}

class GlidoApp extends StatelessWidget {
  const GlidoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()..bootstrap()),
        ChangeNotifierProvider(create: (_) => CartState()),
        ChangeNotifierProvider(create: (_) => GroceryCartState()),
      ],
      child: MaterialApp(
        title: 'Glido',
        debugShowCheckedModeBanner: false,
        theme: buildGlidoTheme(),
        home: const _RootRouter(),
      ),
    );
  }
}

class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return auth.user != null ? const HomeShell() : const LoginScreen();
  }
}
