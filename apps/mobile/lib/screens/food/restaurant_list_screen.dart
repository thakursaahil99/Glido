import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../widgets/error_state.dart';
import '../../widgets/restaurant_card.dart';
import '../notifications/notification_bell.dart';
import '../search/search_screen.dart';

// Quick filters are plain predicates over data already loaded — no fabricated
// claims, mirrors apps/web/src/app/(site)/food/page.tsx's QUICK_FILTERS.
class _QuickFilter {
  final String key;
  final String label;
  final bool Function(Restaurant) test;
  const _QuickFilter(this.key, this.label, this.test);
}

final _quickFilters = <_QuickFilter>[
  _QuickFilter('openNow', 'Open now', (r) => r.isOpen),
  _QuickFilter('freeDelivery', '0 delivery fee', (r) => r.deliveryFee == 0),
  _QuickFilter('topRated', 'Rated 4.0+', (r) => r.ratingAvg >= 4),
  _QuickFilter('fastDelivery', 'Under 30 min', (r) => r.avgDeliveryTimeMin <= 30),
];

class RestaurantListScreen extends StatefulWidget {
  const RestaurantListScreen({super.key});

  @override
  State<RestaurantListScreen> createState() => _RestaurantListScreenState();
}

class _RestaurantListScreenState extends State<RestaurantListScreen> {
  List<Restaurant>? _restaurants;
  String? _error;
  final Set<String> _activeFilters = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({String? search}) async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>(
        '/restaurants',
        query: {'pageSize': 50, if (search != null && search.isNotEmpty) 'search': search},
      );
      final items = (res['items'] as List<dynamic>).map((r) => Restaurant.fromJson(r)).toList();
      setState(() => _restaurants = items);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not load restaurants.');
    }
  }

  // "Trending Near You": top-rated restaurants among those with at least one
  // real rating — a legitimate signal derived from ratingAvg, not fabricated.
  List<Restaurant> get _trending {
    final list = (_restaurants ?? []).where((r) => r.ratingCount > 0).toList()
      ..sort((a, b) => b.ratingAvg.compareTo(a.ratingAvg));
    return list.take(8).toList();
  }

  List<Restaurant> get _filtered {
    if (_restaurants == null) return [];
    return _restaurants!.where((r) => _activeFilters.every((key) {
          final f = _quickFilters.firstWhere((f) => f.key == key);
          return f.test(r);
        })).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            children: [
              TextSpan(text: 'G', style: TextStyle(color: context.colors.primary)),
              TextSpan(text: 'lido Food', style: TextStyle(color: context.colors.ink)),
            ],
          ),
        ),
        actions: const [NotificationBellButton()],
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: GestureDetector(
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SearchScreen())),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(color: context.colors.surface, borderRadius: BorderRadius.circular(16), boxShadow: glidoCardShadow(opacity: 0.06)),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: context.colors.muted),
                      const SizedBox(width: 10),
                      Text('Search restaurants or cuisines', style: TextStyle(color: context.colors.muted, fontSize: 13.5)),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _load);
    if (_restaurants == null) return const Center(child: CircularProgressIndicator());
    if (_restaurants!.isEmpty) return const Center(child: Text('No restaurants found.'));

    final trending = _trending;
    final filtered = _filtered;

    return ListView(
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 16),
      children: [
        // Non-numeric promo — there's no real platform-wide discount signal here,
        // so this stays generic instead of a fabricated "FLAT 50% OFF" banner.
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: GlidoGradients.foodTile(context.colors),
              borderRadius: BorderRadius.circular(20),
              boxShadow: glidoButtonShadow(context.colors.food),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(20)),
                        child: const Text('GREAT DEALS NEAR YOU', style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 8),
                      const Text('Hungry? We\'ve got you covered', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Text('Top-rated restaurants, delivered fast', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (trending.length >= 3) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                Icon(Icons.auto_awesome, size: 16, color: context.colors.foodDark),
                const SizedBox(width: 6),
                const Text('Trending Near You', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          SizedBox(
            height: 190,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: trending.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => SizedBox(width: 160, child: RestaurantCard(restaurant: trending[i], imageHeight: 100)),
            ),
          ),
          const SizedBox(height: 18),
        ],
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _quickFilters.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final f = _quickFilters[i];
                final active = _activeFilters.contains(f.key);
                return ChoiceChip(
                  label: Text(f.label),
                  selected: active,
                  onSelected: (v) => setState(() {
                    if (v) {
                      _activeFilters.add(f.key);
                    } else {
                      _activeFilters.remove(f.key);
                    }
                  }),
                  selectedColor: context.colors.food,
                  labelStyle: TextStyle(color: active ? Colors.white : context.colors.muted, fontWeight: FontWeight.w600, fontSize: 12.5),
                  backgroundColor: context.colors.surface,
                  side: BorderSide(color: active ? context.colors.food : context.colors.border),
                  showCheckmark: false,
                );
              },
            ),
          ),
        ),
        if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('No restaurants match these filters.')),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.78),
            itemCount: filtered.length,
            itemBuilder: (context, i) => RestaurantCard(restaurant: filtered[i], imageHeight: 110),
          ),
      ],
    );
  }
}
