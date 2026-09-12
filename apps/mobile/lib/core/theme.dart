import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Mirrors the web app's brand tokens in apps/web/src/app/globals.css.
class GlidoColors {
  static const primary = Color(0xFFFF6A00);
  static const primaryDark = Color(0xFFC94F00);
  static const primaryLight = Color(0xFFFFF1E6);
  static const accent = Color(0xFFF99C00);
  static const success = Color(0xFF0EA36C);
  static const successLight = Color(0xFFE6F7EF);
  static const danger = Color(0xFFE40014);
  static const dangerLight = Color(0xFFFDEAEC);
  static const ink = Color(0xFF101418);
  static const muted = Color(0xFF5B6470);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFEDEEF0);
  static const bg = Color(0xFFFAF9F7);
}

/// Reusable gradients — this is where the "3D"/premium feel comes from:
/// depth via soft shadows + a warm gradient instead of flat single-tone fills.
class GlidoGradients {
  static const primaryButton = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF7F1F), GlidoColors.primary, GlidoColors.primaryDark],
    stops: [0, 0.55, 1],
  );

  static const heroBg = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFE3CC), Color(0xFFFFF6EC), GlidoColors.bg],
    stops: [0, 0.55, 1],
  );

  static const walletCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF7F1F), GlidoColors.primary, Color(0xFFB84500)],
  );
}

List<BoxShadow> glidoCardShadow({double opacity = 0.06}) => [
      BoxShadow(color: Colors.black.withValues(alpha: opacity), blurRadius: 18, offset: const Offset(0, 8)),
      BoxShadow(color: Colors.black.withValues(alpha: opacity * 0.6), blurRadius: 4, offset: const Offset(0, 2)),
    ];

List<BoxShadow> glidoButtonShadow() => [
      BoxShadow(color: GlidoColors.primary.withValues(alpha: 0.32), blurRadius: 16, offset: const Offset(0, 8)),
    ];

ThemeData buildGlidoTheme() {
  final textTheme = GoogleFonts.spaceGroteskTextTheme().apply(
    bodyColor: GlidoColors.ink,
    displayColor: GlidoColors.ink,
  );

  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: GlidoColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: GlidoColors.primary,
      primary: GlidoColors.primary,
      error: GlidoColors.danger,
      surface: GlidoColors.surface,
    ),
    textTheme: textTheme,
    splashFactory: InkSparkle.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: GlidoColors.bg,
      foregroundColor: GlidoColors.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
    ),
    cardTheme: CardThemeData(
      color: GlidoColors.surface,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: GlidoColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: GlidoColors.ink,
        side: const BorderSide(color: GlidoColors.border, width: 1.4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GlidoColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: GlidoColors.primary, width: 1.8),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: GlidoColors.surface,
      selectedItemColor: GlidoColors.primary,
      unselectedItemColor: GlidoColors.muted,
      type: BottomNavigationBarType.fixed,
      elevation: 12,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5),
      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11.5),
    ),
  );
}
