import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Mirrors the web app's brand tokens in apps/web/src/app/globals.css — warm,
/// saturated, candy-bright tri-service palette. This is a ThemeExtension (not
/// static consts) so screens read colors via `context.colors.xxx` and always
/// get the right light/dark value — the same idea as the web's CSS custom
/// properties, just expressed through Flutter's theming system.
@immutable
class GlidoColors extends ThemeExtension<GlidoColors> {
  const GlidoColors({
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
    required this.accent,
    required this.accentLight,
    required this.success,
    required this.successLight,
    required this.danger,
    required this.dangerLight,
    required this.ink,
    required this.muted,
    required this.surface,
    required this.surfaceAlt,
    required this.border,
    required this.bg,
    required this.heroBg,
    required this.food,
    required this.foodDark,
    required this.grocery,
    required this.groceryDark,
    required this.groceryLight,
    required this.cab,
    required this.cabDark,
    required this.cabLight,
  });

  final Color primary;
  final Color primaryDark;
  final Color primaryLight;
  final Color accent;
  final Color accentLight;
  final Color success;
  final Color successLight;
  final Color danger;
  final Color dangerLight;
  final Color ink;
  final Color muted;
  final Color surface;
  final Color surfaceAlt;
  final Color border;
  final Color bg;

  /// Fixed dark tone for hero/banner sections and for text sitting on a fixed
  /// white chip over them — stays dark in BOTH themes. `ink` flips to near-white
  /// in dark mode (it doubles as body text there), so using `ink` for a hero
  /// background or for text-on-a-white-pill would make it invisible in dark
  /// mode. This is the same bug class fixed on web via `--glido-hero-bg`.
  final Color heroBg;

  // Module identity colors — food/grocery/cab each read as their own vivid color.
  final Color food;
  final Color foodDark;
  final Color grocery;
  final Color groceryDark;
  final Color groceryLight;
  final Color cab;
  final Color cabDark;
  final Color cabLight;

  static const light = GlidoColors(
    primary: Color(0xFFFF4B26),
    primaryDark: Color(0xFFC92A0A),
    primaryLight: Color(0xFFFFE3D6),
    accent: Color(0xFFFFB020),
    accentLight: Color(0xFFFFF1D6),
    success: Color(0xFF00C37D),
    successLight: Color(0xFFD7FBE9),
    danger: Color(0xFFE0311E),
    dangerLight: Color(0xFFFFE0DA),
    ink: Color(0xFF241712),
    muted: Color(0xFF7A6A62),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFFFFAF5),
    border: Color(0xFFF3E4D9),
    bg: Color(0xFFFFF8F1),
    heroBg: Color(0xFF241712),
    food: Color(0xFFFF4B26),
    foodDark: Color(0xFFC92A0A),
    grocery: Color(0xFF00C37D),
    groceryDark: Color(0xFF00874F),
    groceryLight: Color(0xFFD7FBE9),
    cab: Color(0xFF4A5CFF),
    cabDark: Color(0xFF2C3CE0),
    cabLight: Color(0xFFE2E6FF),
  );

  // Same dark values as the web's `[data-theme="dark"]` block in globals.css —
  // kept numerically identical so the two clients read as one brand.
  static const dark = GlidoColors(
    primary: Color(0xFFFF6A41),
    primaryDark: Color(0xFFFFB49A),
    primaryLight: Color(0x29FF6A41),
    accent: Color(0xFFFFC247),
    accentLight: Color(0x29FFC247),
    success: Color(0xFF2FE0A0),
    successLight: Color(0x242FE0A0),
    danger: Color(0xFFFF6259),
    dangerLight: Color(0x24FF6259),
    ink: Color(0xFFF3EFEB),
    muted: Color(0xFFA39A92),
    surface: Color(0xFF1C1C22),
    surfaceAlt: Color(0xFF232329),
    border: Color(0xFF333138),
    bg: Color(0xFF121214),
    heroBg: Color(0xFF241712),
    food: Color(0xFFFF6A41),
    foodDark: Color(0xFFFFB49A),
    grocery: Color(0xFF2FE0A0),
    groceryDark: Color(0xFF8FF5CE),
    groceryLight: Color(0x242FE0A0),
    cab: Color(0xFF6F80FF),
    cabDark: Color(0xFFB7C0FF),
    cabLight: Color(0x296F80FF),
  );

  @override
  GlidoColors copyWith({
    Color? primary,
    Color? primaryDark,
    Color? primaryLight,
    Color? accent,
    Color? accentLight,
    Color? success,
    Color? successLight,
    Color? danger,
    Color? dangerLight,
    Color? ink,
    Color? muted,
    Color? surface,
    Color? surfaceAlt,
    Color? border,
    Color? bg,
    Color? heroBg,
    Color? food,
    Color? foodDark,
    Color? grocery,
    Color? groceryDark,
    Color? groceryLight,
    Color? cab,
    Color? cabDark,
    Color? cabLight,
  }) {
    return GlidoColors(
      primary: primary ?? this.primary,
      primaryDark: primaryDark ?? this.primaryDark,
      primaryLight: primaryLight ?? this.primaryLight,
      accent: accent ?? this.accent,
      accentLight: accentLight ?? this.accentLight,
      success: success ?? this.success,
      successLight: successLight ?? this.successLight,
      danger: danger ?? this.danger,
      dangerLight: dangerLight ?? this.dangerLight,
      ink: ink ?? this.ink,
      muted: muted ?? this.muted,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      border: border ?? this.border,
      bg: bg ?? this.bg,
      heroBg: heroBg ?? this.heroBg,
      food: food ?? this.food,
      foodDark: foodDark ?? this.foodDark,
      grocery: grocery ?? this.grocery,
      groceryDark: groceryDark ?? this.groceryDark,
      groceryLight: groceryLight ?? this.groceryLight,
      cab: cab ?? this.cab,
      cabDark: cabDark ?? this.cabDark,
      cabLight: cabLight ?? this.cabLight,
    );
  }

  @override
  GlidoColors lerp(ThemeExtension<GlidoColors>? other, double t) {
    if (other is! GlidoColors) return this;
    return GlidoColors(
      primary: Color.lerp(primary, other.primary, t)!,
      primaryDark: Color.lerp(primaryDark, other.primaryDark, t)!,
      primaryLight: Color.lerp(primaryLight, other.primaryLight, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentLight: Color.lerp(accentLight, other.accentLight, t)!,
      success: Color.lerp(success, other.success, t)!,
      successLight: Color.lerp(successLight, other.successLight, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerLight: Color.lerp(dangerLight, other.dangerLight, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      border: Color.lerp(border, other.border, t)!,
      bg: Color.lerp(bg, other.bg, t)!,
      heroBg: Color.lerp(heroBg, other.heroBg, t)!,
      food: Color.lerp(food, other.food, t)!,
      foodDark: Color.lerp(foodDark, other.foodDark, t)!,
      grocery: Color.lerp(grocery, other.grocery, t)!,
      groceryDark: Color.lerp(groceryDark, other.groceryDark, t)!,
      groceryLight: Color.lerp(groceryLight, other.groceryLight, t)!,
      cab: Color.lerp(cab, other.cab, t)!,
      cabDark: Color.lerp(cabDark, other.cabDark, t)!,
      cabLight: Color.lerp(cabLight, other.cabLight, t)!,
    );
  }
}

/// Shorthand so call sites read `context.colors.primary` instead of the
/// longer `Theme.of(context).extension<GlidoColors>()!.primary`.
extension GlidoContext on BuildContext {
  GlidoColors get colors => Theme.of(this).extension<GlidoColors>()!;
}

/// Reusable gradients — this is where the "3D"/premium feel comes from: depth
/// via soft shadows + a bold multi-hue gradient instead of flat single-tone
/// fills. Each takes the current `GlidoColors` so it follows light/dark too.
class GlidoGradients {
  static LinearGradient primaryButton(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFFFF7A50), c.primary, c.primaryDark],
        stops: const [0, 0.5, 1],
      );

  static LinearGradient heroBg(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [c.primary, c.primaryDark, c.heroBg],
        stops: const [0, 0.45, 0.95],
      );

  static LinearGradient walletCard(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFFFF7A50), c.primary, c.primaryDark],
      );

  static LinearGradient foodTile(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFFFF7A50), c.food, c.foodDark],
      );

  static LinearGradient groceryTile(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFF34D399), c.grocery, c.groceryDark],
      );

  static LinearGradient cabTile(GlidoColors c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [const Color(0xFF7B8CFF), c.cab, c.cabDark],
      );
}

List<BoxShadow> glidoCardShadow({double opacity = 0.06}) => [
      BoxShadow(color: Colors.black.withValues(alpha: opacity), blurRadius: 18, offset: const Offset(0, 8)),
      BoxShadow(color: Colors.black.withValues(alpha: opacity * 0.6), blurRadius: 4, offset: const Offset(0, 2)),
    ];

List<BoxShadow> glidoButtonShadow(Color primary) => [
      BoxShadow(color: primary.withValues(alpha: 0.32), blurRadius: 16, offset: const Offset(0, 8)),
    ];

ThemeData _buildGlidoTheme(GlidoColors c, Brightness brightness) {
  final textTheme = GoogleFonts.plusJakartaSansTextTheme(
    brightness == Brightness.dark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
  ).apply(
    bodyColor: c.ink,
    displayColor: c.ink,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: c.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: c.primary,
      brightness: brightness,
      primary: c.primary,
      error: c.danger,
      surface: c.surface,
    ),
    textTheme: textTheme,
    splashFactory: InkSparkle.splashFactory,
    extensions: [c],
    appBarTheme: AppBarTheme(
      backgroundColor: c.bg,
      foregroundColor: c.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
    ),
    cardTheme: CardThemeData(
      color: c.surface,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: c.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.ink,
        side: BorderSide(color: c.border, width: 1.4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: const StadiumBorder(),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface,
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
        borderSide: BorderSide(color: c.primary, width: 1.8),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: c.surface,
      selectedItemColor: c.primary,
      unselectedItemColor: c.muted,
      type: BottomNavigationBarType.fixed,
      elevation: 12,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11.5),
      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11.5),
    ),
  );
}

ThemeData buildGlidoLightTheme() => _buildGlidoTheme(GlidoColors.light, Brightness.light);
ThemeData buildGlidoDarkTheme() => _buildGlidoTheme(GlidoColors.dark, Brightness.dark);
