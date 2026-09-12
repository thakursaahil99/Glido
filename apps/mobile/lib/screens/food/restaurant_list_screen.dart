import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../widgets/error_state.dart';
import '../../widgets/restaurant_card.dart';
import '../notifications/notification_bell.dart';
import '../search/search_screen.dart';

class RestaurantListScreen extends StatefulWidget {
  const RestaurantListScreen({super.key});

  @override
  State<RestaurantListScreen> createState() => _RestaurantListScreenState();
}

class _RestaurantListScreenState extends State<RestaurantListScreen> {
  List<Restaurant>? _restaurants;
  String? _error;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            children: [
              TextSpan(text: 'G', style: TextStyle(color: GlidoColors.primary)),
              TextSpan(text: 'lido Food', style: TextStyle(color: GlidoColors.ink)),
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
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: glidoCardShadow(opacity: 0.06)),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: GlidoColors.muted),
                      const SizedBox(width: 10),
                      Text('Search restaurants or cuisines', style: TextStyle(color: GlidoColors.muted, fontSize: 13.5)),
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

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 0.78),
      itemCount: _restaurants!.length,
      itemBuilder: (context, i) => RestaurantCard(restaurant: _restaurants![i], imageHeight: 110),
    );
  }
}
