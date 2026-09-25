import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/grocery.dart';
import '../../models/restaurant.dart';
import '../../widgets/grocery_product_card.dart';
import '../../widgets/restaurant_card.dart';

/// A single search box across Food + Grocery, like Blinkit/Zomato's unified
/// search — the web app searches each module separately, but a super-app
/// home screen should let you search everything from one place.
class SearchScreen extends StatefulWidget {
  final String initialQuery;
  const SearchScreen({super.key, this.initialQuery = ''});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final TextEditingController _ctrl = TextEditingController(text: widget.initialQuery);
  Timer? _debounce;
  bool _loading = false;
  List<Restaurant> _restaurants = [];
  List<GroceryProduct> _products = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery.isNotEmpty) _search(widget.initialQuery);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _search(value));
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _restaurants = [];
        _products = [];
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get<Map<String, dynamic>>('/restaurants', query: {'search': query, 'pageSize': 20}),
        ApiClient.instance.get<Map<String, dynamic>>('/grocery/products', query: {'search': query, 'pageSize': 20}),
      ]);
      if (!mounted) return;
      setState(() {
        _restaurants = (results[0]['items'] as List<dynamic>).map((r) => Restaurant.fromJson(r)).toList();
        _products = (results[1]['items'] as List<dynamic>).map((p) => GroceryProduct.fromJson(p)).toList();
      });
    } catch (_) {
      // best-effort — keep whatever we last had
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasQuery = _ctrl.text.trim().isNotEmpty;
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: widget.initialQuery.isEmpty,
          onChanged: _onChanged,
          decoration: const InputDecoration(hintText: 'Search restaurants, dishes, groceries...', border: InputBorder.none, isCollapsed: true),
        ),
      ),
      body: !hasQuery
          ? Center(child: Text('Search for anything on Glido', style: TextStyle(color: context.colors.muted)))
          : _loading && _restaurants.isEmpty && _products.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : (_restaurants.isEmpty && _products.isEmpty)
                  ? const Center(child: Text('No results found.'))
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_restaurants.isNotEmpty) ...[
                          const Text('Restaurants', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          const SizedBox(height: 10),
                          ..._restaurants.map((r) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: RestaurantCard(restaurant: r),
                              )),
                        ],
                        if (_products.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          const Text('Groceries', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          const SizedBox(height: 10),
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, mainAxisExtent: 214),
                            itemCount: _products.length,
                            itemBuilder: (context, i) => GroceryProductCard(product: _products[i]),
                          ),
                        ],
                      ],
                    ),
    );
  }
}
