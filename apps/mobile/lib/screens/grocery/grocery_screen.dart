import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/grocery.dart';
import '../../state/grocery_cart_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/grocery_product_card.dart';
import '../../widgets/network_image.dart';
import '../notifications/notification_bell.dart';
import 'grocery_cart_screen.dart';

class GroceryScreen extends StatefulWidget {
  const GroceryScreen({super.key});

  @override
  State<GroceryScreen> createState() => _GroceryScreenState();
}

class _GroceryScreenState extends State<GroceryScreen> {
  List<GroceryCategory> _categories = [];
  String? _activeCategoryId;
  List<GroceryProduct>? _products;
  String? _error;
  final _searchCtrl = TextEditingController();

  /// An unfiltered catalog snapshot, used only to power the "Lightning Deals" /
  /// "Popular Picks" discovery rows below — independent of the category/search
  /// filters that drive the main product grid. Mirrors the web grocery page.
  List<GroceryProduct>? _catalog;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.get<List<dynamic>>('/grocery/categories').then((res) {
      if (mounted) setState(() => _categories = res.map((c) => GroceryCategory.fromJson(c)).toList());
    }).catchError((_) {});
    ApiClient.instance.get<Map<String, dynamic>>('/grocery/products', query: {'pageSize': 60}).then((res) {
      if (!mounted) return;
      final items = (res['items'] as List<dynamic>).map((p) => GroceryProduct.fromJson(p)).toList();
      setState(() => _catalog = items);
    }).catchError((_) {
      if (mounted) setState(() => _catalog = []);
    });
    _loadProducts();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/grocery/products', query: {
        'pageSize': 60,
        if (_activeCategoryId != null) 'categoryId': _activeCategoryId,
        if (_searchCtrl.text.isNotEmpty) 'search': _searchCtrl.text,
      });
      final items = (res['items'] as List<dynamic>).map((p) => GroceryProduct.fromJson(p)).toList();
      setState(() => _products = items);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Could not load products.');
    }
  }

  static double _discountPercent(GroceryProduct p) => p.mrp > p.price ? ((p.mrp - p.price) / p.mrp) * 100 : 0;

  List<GroceryProduct> get _dealProducts {
    final list = (_catalog ?? []).where((p) => _discountPercent(p) > 0).toList()
      ..sort((a, b) => _discountPercent(b).compareTo(_discountPercent(a)));
    return list.take(10).toList();
  }

  List<GroceryProduct> get _popularProducts {
    final dealIds = _dealProducts.map((p) => p.id).toSet();
    final list = (_catalog ?? []).where((p) => !dealIds.contains(p.id)).toList().reversed.toList();
    return list.take(10).toList();
  }

  int get _maxDiscount => _dealProducts.isNotEmpty ? _discountPercent(_dealProducts.first).round() : 0;

  String? get _activeCategoryName {
    if (_activeCategoryId == null) return null;
    for (final c in _categories) {
      if (c.id == _activeCategoryId) return c.name;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<GroceryCartState>();

    return Scaffold(
      appBar: AppBar(
        title: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
            children: [
              TextSpan(text: 'Glido', style: TextStyle(color: context.colors.primary)),
              TextSpan(text: ' Grocery', style: TextStyle(color: context.colors.ink)),
            ],
          ),
        ),
        actions: const [NotificationBellButton()],
      ),
      body: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _loadProducts,
            child: ListView(
              padding: const EdgeInsets.only(bottom: 90),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Container(
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), boxShadow: glidoCardShadow(opacity: 0.06)),
                    child: TextField(
                      controller: _searchCtrl,
                      decoration: const InputDecoration(hintText: 'Search for atta, milk, chips...', prefixIcon: Icon(Icons.search)),
                      onSubmitted: (_) => _loadProducts(),
                    ),
                  ),
                ),
                _buildAisleSection(),
                if (_dealProducts.isNotEmpty) _buildDiscoveryRow(
                  icon: Icons.bolt,
                  title: 'Lightning Deals',
                  trailing: 'Up to $_maxDiscount% off',
                  products: _dealProducts,
                ),
                if (_popularProducts.isNotEmpty) _buildDiscoveryRow(
                  icon: Icons.auto_awesome,
                  title: 'Popular Picks',
                  products: _popularProducts,
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                  child: Row(
                    children: [
                      Icon(Icons.shopping_basket_outlined, size: 16, color: context.colors.groceryDark),
                      const SizedBox(width: 6),
                      Text(
                        _activeCategoryName ?? (_searchCtrl.text.isNotEmpty ? 'Results for "${_searchCtrl.text}"' : 'All groceries'),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
                    ],
                  ),
                ),
                _buildGridSection(),
              ],
            ),
          ),
          if (cart.itemCount > 0)
            Positioned(
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
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const GroceryCartScreen())),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                        child: Text('View cart · ${cart.itemCount} items · ₹${cart.subtotal.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAisleSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.grid_view_rounded, size: 16, color: context.colors.groceryDark),
              const SizedBox(width: 6),
              const Text('Explore Aisle', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 14,
            children: [
              _AisleTile(
                label: 'All',
                imageUrl: null,
                selected: _activeCategoryId == null,
                onTap: () {
                  setState(() => _activeCategoryId = null);
                  _loadProducts();
                },
              ),
              ..._categories.map((c) => _AisleTile(
                    label: c.name,
                    imageUrl: c.imageUrl,
                    selected: _activeCategoryId == c.id,
                    onTap: () {
                      setState(() => _activeCategoryId = c.id);
                      _loadProducts();
                    },
                  )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDiscoveryRow({required IconData icon, required String title, String? trailing, required List<GroceryProduct> products}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 16, color: context.colors.groceryDark),
                    const SizedBox(width: 6),
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ],
                ),
                if (trailing != null)
                  Text(trailing, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: context.colors.muted)),
              ],
            ),
          ),
          SizedBox(
            height: 214,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: products.length,
              itemBuilder: (context, i) => Padding(
                padding: const EdgeInsets.only(right: 12),
                child: SizedBox(width: 152, child: GroceryProductCard(product: products[i])),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGridSection() {
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _loadProducts);
    if (_products == null) return const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
    if (_products!.isEmpty) return const Padding(padding: EdgeInsets.all(32), child: Center(child: Text('No products found.')));

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, mainAxisExtent: 214),
      itemCount: _products!.length,
      itemBuilder: (context, i) => GroceryProductCard(product: _products![i]),
    );
  }
}

class _AisleTile extends StatelessWidget {
  final String label;
  final bool selected;
  final String? imageUrl;
  final VoidCallback onTap;

  const _AisleTile({required this.label, required this.selected, this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 68,
        child: Column(
          children: [
            Container(
              height: 56,
              width: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: selected ? context.colors.grocery : context.colors.border, width: selected ? 2 : 1.2),
                color: selected ? context.colors.groceryLight : context.colors.surface,
                boxShadow: glidoCardShadow(opacity: 0.05),
              ),
              clipBehavior: Clip.antiAlias,
              child: imageUrl != null
                  ? GlidoNetworkImage(url: imageUrl, icon: Icons.shopping_basket)
                  : Icon(Icons.grid_view_rounded, color: selected ? context.colors.groceryDark : context.colors.muted, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: selected ? context.colors.groceryDark : context.colors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
