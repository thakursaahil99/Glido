import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Mirrors the web app's brand tokens in apps/web/src/app/globals.css —
/// warm, saturated, candy-bright tri-service palette.
class GlidoColors {
  static const primary = Color(0xFFFF4B26);
  static const primaryDark = Color(0xFFC92A0A);
  static const primaryLight = Color(0xFFFFE3D6);
  static const accent = Color(0xFFFFB020);
  static const accentLight = Color(0xFFFFF1D6);
  static const success = Color(0xFF00C37D);
  static const successLight = Color(0xFFD7FBE9);
  static const danger = Color(0xFFE0311E);
  static const dangerLight = Color(0xFFFFE0DA);
  static const ink = Color(0xFF241712);
  static const muted = Color(0xFF7A6A62);
  static const surface = Color(0xFFFFFFFF);
  static const border = Color(0xFFF3E4D9);
  static const bg = Color(0xFFFFF8F1);

  // Module identity colors — food/grocery/cab each read as their own vivid color.
  static const food = primary;
  static const foodDark = primaryDark;
  static const grocery = Color(0xFF00C37D);
  static const groceryDark = Color(0xFF00874F);
  static const groceryLight = Color(0xFFD7FBE9);
  static const cab = Color(0xFF4A5CFF);
  static const cabDark = Color(0xFF2C3CE0);
  static const cabLight = Color(0xFFE2E6FF);
}

/// Reusable gradients — this is where the "3D"/premium feel comes from:
/// depth via soft shadows + a bold multi-hue gradient instead of flat single-tone fills.
class GlidoGradients {
  static const primaryButton = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF7A50), GlidoColors.primary, GlidoColors.primaryDark],
    stops: [0, 0.5, 1],
  );

  static const heroBg = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [GlidoColors.primary, GlidoColors.primaryDark, GlidoColors.ink],
    stops: [0, 0.45, 0.95],
  );

  static const walletCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF7A50), GlidoColors.primary, GlidoColors.primaryDark],
  );

  static const foodTile = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF7A50), GlidoColors.food, GlidoColors.foodDark],
  );

  static const groceryTile = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF34D399), GlidoColors.grocery, GlidoColors.groceryDark],
  );

  static const cabTile = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF7B8CFF), GlidoColors.cab, GlidoColors.cabDark],
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
  final textTheme = GoogleFonts.plusJakartaSansTextTheme().apply(
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
      shadowColor: Colors.black.withValues(alpha: 0.08),
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: GlidoColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: GlidoColors.ink,
        side: const BorderSide(color: GlidoColors.border, width: 1.4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: const StadiumBorder(),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: GlidoColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
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
