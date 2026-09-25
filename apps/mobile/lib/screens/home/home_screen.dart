import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/banner.dart';
import '../../models/grocery.dart';
import '../../models/restaurant.dart';
import '../../state/grocery_cart_state.dart';
import '../../state/theme_state.dart';
import '../../widgets/grocery_product_card.dart';
import '../../widgets/network_image.dart';
import '../../widgets/restaurant_card.dart';
import '../grocery/grocery_cart_screen.dart';
import '../notifications/notification_bell.dart';
import '../search/search_screen.dart';

/// Mirrors apps/web/src/app/(site)/page.tsx — but goes further than the web
/// homepage: it's a real Blinkit/Zomato-style "everything" screen, so it also
/// surfaces grocery products directly rather than only linking out to them.
///
/// Layout order (top to bottom): hero + search + banners together up top,
/// then the 3 module tiles, a few restaurants, a few grocery items, a
/// "shop by category" row, and the lighter how-it-works/partner content last.
class HomeScreen extends StatefulWidget {
  final void Function(int tabIndex) onNavigateToTab;
  const HomeScreen({super.key, required this.onNavigateToTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Restaurant>? _restaurants;
  List<GroceryProduct>? _products;
  List<GroceryCategory> _categories = [];
  List<GlidoBanner> _banners = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([
        ApiClient.instance.get<Map<String, dynamic>>(
          '/restaurants',
          query: {'pageSize': 6},
        ),
        ApiClient.instance.get<Map<String, dynamic>>(
          '/grocery/products',
          query: {'pageSize': 6},
        ),
        ApiClient.instance.get<List<dynamic>>('/banners'),
        ApiClient.instance.get<List<dynamic>>('/grocery/categories'),
      ]);
      setState(() {
        _restaurants = (results[0] as Map<String, dynamic>)['items']
            .map<Restaurant>((r) => Restaurant.fromJson(r))
            .toList();
        _products = (results[1] as Map<String, dynamic>)['items']
            .map<GroceryProduct>((p) => GroceryProduct.fromJson(p))
            .toList();
        _banners = (results[2] as List<dynamic>)
            .map((b) => GlidoBanner.fromJson(b))
            .toList();
        _categories = (results[3] as List<dynamic>)
            .map((c) => GroceryCategory.fromJson(c))
            .toList();
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(
        () => _error =
            'Could not load the homepage. Check that the API is running.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _Hero(banners: _banners),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          _error!,
                          style: TextStyle(color: context.colors.danger),
                        ),
                      ),
                    ),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: _QuickTile(
                            icon: Icons.restaurant_menu,
                            label: 'Food',
                            gradient: GlidoGradients.foodTile(context.colors),
                            onTap: () => widget.onNavigateToTab(1),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _QuickTile(
                            icon: Icons.shopping_cart,
                            label: 'Grocery',
                            gradient: GlidoGradients.groceryTile(context.colors),
                            onTap: () => widget.onNavigateToTab(2),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _QuickTile(
                            icon: Icons.local_taxi,
                            label: 'Cab',
                            gradient: GlidoGradients.cabTile(context.colors),
                            onTap: () => widget.onNavigateToTab(3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Popular restaurants near you',
                    onSeeAll: () => widget.onNavigateToTab(1),
                  ),
                  if (_restaurants == null && _error == null)
                    const _HorizontalSkeletonRow()
                  else if (_restaurants != null)
                    SizedBox(
                      height: 210,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _restaurants!.length,
                        itemBuilder: (context, i) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: SizedBox(
                            width: 168,
                            child: RestaurantCard(restaurant: _restaurants![i]),
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Grocery essentials',
                    onSeeAll: () => widget.onNavigateToTab(2),
                  ),
                  if (_products == null && _error == null)
                    const _HorizontalSkeletonRow()
                  else if (_products != null)
                    SizedBox(
                      height: 214,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _products!.length,
                        itemBuilder: (context, i) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: SizedBox(
                            width: 152,
                            child: GroceryProductCard(product: _products![i]),
                          ),
                        ),
                      ),
                    ),
                  if (_categories.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _SectionHeader(
                      title: 'Shop by category',
                      onSeeAll: () => widget.onNavigateToTab(2),
                    ),
                    SizedBox(
                      height: 110,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _categories.length,
                        itemBuilder: (context, i) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: _CategoryCard(
                            category: _categories[i],
                            onTap: () => widget.onNavigateToTab(2),
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  const _HowItWorksSection(),
                  const SizedBox(height: 24),
                  const _PartnerCtaSection(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          Consumer<GroceryCartState>(
            builder: (context, cart, _) {
              if (cart.itemCount == 0) return const SizedBox.shrink();
              return Positioned(
                left: 0,
                right: 0,
                bottom: 16,
                child: Center(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: GlidoGradients.primaryButton(context.colors),
                      boxShadow: glidoButtonShadow(context.colors.primary),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const GroceryCartScreen(),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 14,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.shopping_cart,
                                color: Colors.white,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'View cart · ${cart.itemCount} items · ₹${cart.subtotal.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final List<GlidoBanner> banners;
  const _Hero({required this.banners});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
      decoration: BoxDecoration(gradient: GlidoGradients.heroBg(context.colors)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              children: [
                TextSpan(text: 'glid', style: TextStyle(color: Colors.white)),
                TextSpan(text: 'o', style: TextStyle(color: context.colors.accent)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on, size: 17, color: Colors.white),
              const SizedBox(width: 4),
              const Text(
                'Mumbai',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: Colors.white),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.expand_more, size: 16, color: Colors.white70),
              const Spacer(),
              Builder(
                builder: (context) => IconButton(
                  onPressed: () => context.read<ThemeState>().toggle(),
                  tooltip: context.watch<ThemeState>().isDark ? 'Switch to light mode' : 'Switch to dark mode',
                  icon: Icon(
                    context.watch<ThemeState>().isDark ? Icons.wb_sunny_outlined : Icons.dark_mode_outlined,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
              const NotificationBellButton(color: Colors.white),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'Food, groceries\nand rides.',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              height: 1.15,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
          Text(
            'One app. Everything local.',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const SearchScreen())),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: glidoCardShadow(opacity: 0.08),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: context.colors.muted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Search restaurants, dishes, groceries...',
                      style: TextStyle(
                        color: context.colors.muted,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (banners.isNotEmpty) ...[
            const SizedBox(height: 16),
            SizedBox(
              height: 110,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                itemCount: banners.length,
                itemBuilder: (context, i) {
                  final b = banners[i];
                  return Container(
                    width: 260,
                    margin: EdgeInsets.only(
                      right: i == banners.length - 1 ? 0 : 12,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: glidoCardShadow(),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: GlidoNetworkImage(
                      url: b.imageUrl,
                      icon: Icons.local_offer,
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuickTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Gradient gradient;
  final VoidCallback onTap;
  const _QuickTile({
    required this.icon,
    required this.label,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.colors.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            boxShadow: glidoCardShadow(opacity: 0.06),
          ),
          child: Column(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: gradient,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final GroceryCategory category;
  final VoidCallback onTap;
  const _CategoryCard({required this.category, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 92,
        decoration: BoxDecoration(
          color: context.colors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: glidoCardShadow(opacity: 0.06),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 66,
              width: double.infinity,
              child: GlidoNetworkImage(
                url: category.imageUrl,
                icon: Icons.category,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              child: Text(
                category.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onSeeAll;
  const _SectionHeader({required this.title, required this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 8, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
          ),
          TextButton(
            onPressed: onSeeAll,
            child: Row(
              children: const [
                Text('See all', style: TextStyle(fontWeight: FontWeight.w700)),
                Icon(Icons.arrow_forward, size: 15),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HorizontalSkeletonRow extends StatelessWidget {
  const _HorizontalSkeletonRow();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 4,
        itemBuilder: (context, i) => Container(
          width: 150,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: context.colors.border,
            borderRadius: BorderRadius.circular(18),
          ),
        ),
      ),
    );
  }
}

class _HowItWorksSection extends StatelessWidget {
  const _HowItWorksSection();

  @override
  Widget build(BuildContext context) {
    const steps = [
      (
        Icons.place_outlined,
        'Set your location',
        "Tell us where you are so we can show what's nearby.",
      ),
      (
        Icons.shopping_bag_outlined,
        'Order what you need',
        'Food, groceries or a ride — all in one place.',
      ),
      (
        Icons.rocket_launch_outlined,
        'Track it live',
        'Watch your order move from prep to your doorstep.',
      ),
    ];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: glidoCardShadow(),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'How Glido works',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 12),
          for (final step in steps)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: context.colors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(step.$1, color: context.colors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          step.$2,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                          ),
                        ),
                        Text(
                          step.$3,
                          style: TextStyle(
                            fontSize: 12,
                            color: context.colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _PartnerCtaSection extends StatelessWidget {
  const _PartnerCtaSection();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.colors.primaryLight,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Partner with Glido',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'List your restaurant or store.',
                    style: TextStyle(fontSize: 11.5, color: context.colors.muted),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.colors.successLight,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Deliver with Glido',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Flexible hours, weekly payouts.',
                    style: TextStyle(fontSize: 11.5, color: context.colors.muted),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
