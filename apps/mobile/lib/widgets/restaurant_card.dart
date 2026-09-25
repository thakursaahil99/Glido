import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/restaurant.dart';
import '../screens/food/restaurant_detail_screen.dart';
import 'network_image.dart';

/// Blinkit/Zomato-style restaurant card: full-bleed image, rating pill
/// floating on the image, gradient scrim so the name stays legible.
/// Used on both Home and the Food tab so the two feel like one app.
class RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;
  final double imageHeight;

  const RestaurantCard({super.key, required this.restaurant, this.imageHeight = 130});

  @override
  Widget build(BuildContext context) {
    final r = restaurant;
    return Container(
      decoration: BoxDecoration(
        color: context.colors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: glidoCardShadow(),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => RestaurantDetailScreen(restaurantId: r.id))),
          child: Column(
            // No mainAxisSize.min — the card sits in a fixed-height slot, so
            // the text block below is Expanded + centered to absorb any
            // slack evenly instead of leaving a gap under everything.
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: imageHeight,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    GlidoNetworkImage(url: r.imageUrl, icon: Icons.restaurant),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.black.withValues(alpha: 0), Colors.black.withValues(alpha: 0.45)],
                          stops: const [0.55, 1],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: _Pill(
                        color: Colors.white,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star, size: 13, color: context.colors.accent),
                            const SizedBox(width: 3),
                            Text(
                              r.ratingAvg.toStringAsFixed(1),
                              // Fixed dark text — this pill stays white in both themes (it floats on a
                              // photo), so the text must NOT use context.colors.ink, which flips to
                              // near-white in dark mode and would vanish on the white pill.
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5, color: context.colors.heroBg),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (!r.isOpen)
                      Positioned(
                        left: 8,
                        top: 8,
                        child: _Pill(color: context.colors.danger, child: const Text('Closed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 10.5))),
                      ),
                    Positioned(
                      left: 10,
                      right: 10,
                      bottom: 8,
                      child: Text(
                        r.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14.5),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (r.cuisineTagList.isNotEmpty)
                        Text(
                          r.cuisineTagList.join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: context.colors.muted, fontWeight: FontWeight.w500),
                        ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.access_time_filled, size: 12, color: context.colors.muted),
                          const SizedBox(width: 3),
                          Text('${r.avgDeliveryTimeMin} min', style: TextStyle(fontSize: 11.5, color: context.colors.muted, fontWeight: FontWeight.w600)),
                          const SizedBox(width: 10),
                          Icon(Icons.currency_rupee, size: 12, color: context.colors.muted),
                          Text('${r.deliveryFee.toStringAsFixed(0)} delivery', style: TextStyle(fontSize: 11.5, color: context.colors.muted, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final Color color;
  final Widget child;
  const _Pill({required this.color, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: child,
    );
  }
}
