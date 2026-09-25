import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../state/cart_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/network_image.dart';
import '../cart/cart_screen.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final String restaurantId;
  const RestaurantDetailScreen({super.key, required this.restaurantId});

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  Restaurant? _restaurant;
  String? _error;
  bool _vegOnly = false;
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(() => setState(() => _search = _searchCtrl.text));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/restaurants/${widget.restaurantId}');
      setState(() => _restaurant = Restaurant.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not load this restaurant.');
    }
  }

  void _addToCart(MenuItem item, List<String> addonNames) {
    final cart = context.read<CartState>();
    final restaurant = _restaurant!;

    void doAdd() {
      final chosenAddons = item.addons.where((a) => addonNames.contains(a.name));
      final addonsPrice = chosenAddons.fold<double>(0, (sum, a) => sum + a.price);
      cart.addItem(
        restaurant.id,
        restaurant.name,
        CartLineItem(
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          addonNames: addonNames,
          addonsPrice: addonsPrice,
          isVeg: item.isVeg,
        ),
      );
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Added ${item.name} to cart')));
    }

    if (cart.hasDifferentRestaurantItems(restaurant.id)) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Start a new cart?'),
          content: Text('Your cart has items from ${cart.restaurantName}. Adding from ${restaurant.name} will clear it.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                doAdd();
              },
              child: const Text('Clear cart & add'),
            ),
          ],
        ),
      );
      return;
    }
    doAdd();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(appBar: AppBar(), body: ErrorStateView(message: _error!, onRetry: _load));
    }
    if (_restaurant == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final restaurant = _restaurant!;
    final vegFiltered = _vegOnly ? restaurant.menuItems.where((i) => i.isVeg).toList() : restaurant.menuItems;
    final query = _search.trim().toLowerCase();
    final filtered = query.isEmpty ? vegFiltered : vegFiltered.where((i) => i.name.toLowerCase().contains(query)).toList();
    final grouped = <MenuCategory, List<MenuItem>>{};
    for (final cat in restaurant.menuCategories) {
      grouped[cat] = filtered.where((i) => i.categoryId == cat.id).toList();
    }
    final uncategorized = filtered.where((i) => i.categoryId == null).toList();
    if (uncategorized.isNotEmpty) {
      grouped[MenuCategory(id: 'none', name: 'Other', sortOrder: 999)] = uncategorized;
    }
    grouped.removeWhere((key, value) => value.isEmpty);

    // "Chef's Must Try": prefer items with add-ons (customizable/signature
    // dishes), falling back to the first few available items — mirrors
    // apps/web/src/app/(site)/food/[id]/page.tsx's featuredItems derivation.
    // No fabricated bestseller flag or per-item rating.
    final availableItems = vegFiltered.where((i) => i.isAvailable).toList();
    final withAddons = availableItems.where((i) => i.addons.isNotEmpty).toList();
    final featuredItems = (withAddons.length >= 3 ? withAddons : availableItems).take(6).toList();

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 180,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  background: GlidoNetworkImage(url: restaurant.imageUrl, icon: Icons.restaurant),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(restaurant.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: context.colors.primaryLight, borderRadius: BorderRadius.circular(8)),
                            child: Text('★ ${restaurant.ratingAvg.toStringAsFixed(1)} (${restaurant.ratingCount})',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: context.colors.primaryDark)),
                          ),
                        ],
                      ),
                      if (restaurant.cuisineTags != null) ...[
                        const SizedBox(height: 4),
                        Text(restaurant.cuisineTags!, style: TextStyle(color: context.colors.muted, fontSize: 13)),
                      ],
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 16,
                        runSpacing: 4,
                        children: [
                          _InfoChip(icon: Icons.access_time, label: '${restaurant.avgDeliveryTimeMin} min delivery'),
                          _InfoChip(icon: Icons.currency_rupee, label: '₹${restaurant.deliveryFee.toStringAsFixed(0)} delivery fee'),
                          if (restaurant.minOrderAmount > 0) _InfoChip(icon: Icons.info_outline, label: 'Min ₹${restaurant.minOrderAmount.toStringAsFixed(0)}'),
                          if (!restaurant.isOpen)
                            Text('Currently closed', style: TextStyle(color: context.colors.danger, fontWeight: FontWeight.w700, fontSize: 12.5)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (featuredItems.length >= 2)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 0, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(right: 16, bottom: 10),
                          child: Row(
                            children: [
                              Icon(Icons.auto_awesome, size: 16, color: context.colors.foodDark),
                              const SizedBox(width: 6),
                              const Text('Chef\'s Must Try', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                        SizedBox(
                          height: 168,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.only(right: 16),
                            itemCount: featuredItems.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 10),
                            itemBuilder: (context, i) => _FeaturedItemCard(
                              item: featuredItems[i],
                              disabled: !restaurant.isOpen,
                              onTap: () => _addToCart(featuredItems[i], const []),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Menu', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                          Row(
                            children: [
                              Text('Veg only', style: TextStyle(fontSize: 13, color: context.colors.muted)),
                              Switch(
                                value: _vegOnly,
                                onChanged: (v) => setState(() => _vegOnly = v),
                                activeThumbColor: context.colors.success,
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _searchCtrl,
                        decoration: InputDecoration(
                          hintText: 'Search in menu...',
                          prefixIcon: Icon(Icons.search, size: 20, color: context.colors.muted),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (grouped.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('No menu items match this filter yet.')),
                  ),
                )
              else
                for (final entry in grouped.entries) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      child: Text(entry.key.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: _MenuItemCard(
                          item: entry.value[i],
                          disabled: !restaurant.isOpen,
                          onAdd: (addons) => _addToCart(entry.value[i], addons),
                        ),
                      ),
                      childCount: entry.value.length,
                    ),
                  ),
                ],
              const SliverToBoxAdapter(child: SizedBox(height: 90)),
            ],
          ),
          Consumer<CartState>(
            builder: (context, cart, _) {
              if (cart.isEmpty) return const SizedBox.shrink();
              return Positioned(
                left: 0,
                right: 0,
                bottom: 16,
                child: Center(
                  child: Container(
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), gradient: GlidoGradients.primaryButton(context.colors), boxShadow: glidoButtonShadow(context.colors.primary)),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen())),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                          child: Text('View cart · ${cart.itemCount} items', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
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

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: context.colors.muted),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 12.5, color: context.colors.muted)),
      ],
    );
  }
}

class _FeaturedItemCard extends StatelessWidget {
  final MenuItem item;
  final bool disabled;
  final VoidCallback onTap;

  const _FeaturedItemCard({required this.item, required this.disabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final canAdd = !disabled && item.isAvailable;
    return SizedBox(
      width: 132,
      child: Material(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(14),
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: canAdd ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(height: 90, width: double.infinity, child: GlidoNetworkImage(url: item.imageUrl, icon: Icons.fastfood)),
                ),
                const SizedBox(height: 6),
                Icon(Icons.circle, size: 9, color: item.isVeg ? context.colors.success : context.colors.danger),
                const SizedBox(height: 3),
                Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text('₹${item.price.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuItemCard extends StatefulWidget {
  final MenuItem item;
  final bool disabled;
  final void Function(List<String> addonNames) onAdd;

  const _MenuItemCard({required this.item, required this.disabled, required this.onAdd});

  @override
  State<_MenuItemCard> createState() => _MenuItemCardState();
}

class _MenuItemCardState extends State<_MenuItemCard> {
  final Set<String> _selectedAddons = {};
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.circle, size: 10, color: item.isVeg ? context.colors.success : context.colors.danger),
                          if (!item.isAvailable) ...[
                            const SizedBox(width: 8),
                            Text('Sold out', style: TextStyle(fontSize: 11, color: context.colors.muted)),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (item.description != null) ...[
                        const SizedBox(height: 2),
                        Text(item.description!, style: TextStyle(fontSize: 12, color: context.colors.muted)),
                      ],
                      const SizedBox(height: 4),
                      Text('₹${item.price.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (item.addons.isNotEmpty)
                        TextButton(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0), tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                          onPressed: () => setState(() => _expanded = !_expanded),
                          child: Text(_expanded ? 'Hide add-ons' : 'Customize (${item.addons.length} add-ons)', style: const TextStyle(fontSize: 12)),
                        ),
                      if (_expanded)
                        ...item.addons.map((a) => CheckboxListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              value: _selectedAddons.contains(a.name),
                              onChanged: (v) => setState(() {
                                if (v == true) {
                                  _selectedAddons.add(a.name);
                                } else {
                                  _selectedAddons.remove(a.name);
                                }
                              }),
                              title: Text('${a.name}${a.price > 0 ? ' (+₹${a.price.toStringAsFixed(0)})' : ''}', style: const TextStyle(fontSize: 12.5)),
                            )),
                    ],
                  ),
                ),
                if (item.imageUrl != null) ...[
                  const SizedBox(width: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(width: 76, height: 76, child: GlidoNetworkImage(url: item.imageUrl, icon: Icons.fastfood)),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: (widget.disabled || !item.isAvailable) ? null : () => widget.onAdd(_selectedAddons.toList()),
                child: Text(widget.disabled ? 'Restaurant closed' : 'Add to cart'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
