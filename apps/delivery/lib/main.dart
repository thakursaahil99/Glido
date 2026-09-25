import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';
import 'state/auth_state.dart';
import 'state/theme_state.dart';

void main() {
  runApp(const GlidoDeliveryApp());
}

class GlidoDeliveryApp extends StatelessWidget {
  const GlidoDeliveryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()..bootstrap()),
        ChangeNotifierProvider(create: (_) => ThemeState()..bootstrap()),
      ],
      child: Consumer<ThemeState>(
        builder: (context, themeState, _) => MaterialApp(
          title: 'Glido Partner',
          debugShowCheckedModeBanner: false,
          theme: buildGlidoLightTheme(),
          darkTheme: buildGlidoDarkTheme(),
          themeMode: themeState.mode,
          home: const _RootRouter(),
        ),
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
    return auth.user != null ? const HomeScreen() : const LoginScreen();
  }
}
