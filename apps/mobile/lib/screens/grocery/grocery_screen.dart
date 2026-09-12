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

  @override
  void initState() {
    super.initState();
    ApiClient.instance.get<List<dynamic>>('/grocery/categories').then((res) {
      if (mounted) setState(() => _categories = res.map((c) => GroceryCategory.fromJson(c)).toList());
    }).catchError((_) {});
    _loadProducts();
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

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<GroceryCartState>();

    return Scaffold(
      appBar: AppBar(title: const Text('Grocery'), actions: const [NotificationBellButton()]),
      body: Stack(
        children: [
          Column(
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
              SizedBox(
                height: 84,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _CategoryChip(label: 'All', selected: _activeCategoryId == null, imageUrl: null, onTap: () {
                      setState(() => _activeCategoryId = null);
                      _loadProducts();
                    }),
                    ..._categories.map((c) => _CategoryChip(
                          label: c.name,
                          selected: _activeCategoryId == c.id,
                          imageUrl: c.imageUrl,
                          onTap: () {
                            setState(() => _activeCategoryId = c.id);
                            _loadProducts();
                          },
                        )),
                  ],
                ),
              ),
              Expanded(child: _buildGrid()),
            ],
          ),
          if (cart.itemCount > 0)
            Positioned(
              left: 0,
              right: 0,
              bottom: 16,
              child: Center(
                child: Container(
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), gradient: GlidoGradients.primaryButton, boxShadow: glidoButtonShadow()),
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

  Widget _buildGrid() {
    if (_error != null) return ErrorStateView(message: _error!, onRetry: _loadProducts);
    if (_products == null) return const Center(child: CircularProgressIndicator());
    if (_products!.isEmpty) return const Center(child: Text('No products found.'));

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, mainAxisExtent: 214),
      itemCount: _products!.length,
      itemBuilder: (context, i) => GroceryProductCard(product: _products![i]),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final String? imageUrl;
  final VoidCallback onTap;

  const _CategoryChip({required this.label, required this.selected, this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(right: 14),
        child: Column(
          children: [
            Container(
              height: 54,
              width: 54,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: selected ? Border.all(color: GlidoColors.primary, width: 2) : null,
                color: selected ? GlidoColors.primaryLight : Colors.white,
                boxShadow: glidoCardShadow(opacity: 0.05),
              ),
              clipBehavior: Clip.antiAlias,
              child: imageUrl != null ? GlidoNetworkImage(url: imageUrl, icon: Icons.shopping_basket) : Icon(Icons.grid_view_rounded, color: GlidoColors.muted, size: 20),
            ),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: selected ? GlidoColors.primaryDark : GlidoColors.muted)),
          ],
        ),
      ),
    );
  }
}
