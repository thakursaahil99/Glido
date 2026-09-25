class StatsWindow {
  final int orders;
  final double revenue;

  StatsWindow({required this.orders, required this.revenue});

  factory StatsWindow.fromJson(Map<String, dynamic> json) => StatsWindow(
        orders: (json['orders'] as num?)?.toInt() ?? 0,
        revenue: (json['revenue'] as num?)?.toDouble() ?? 0,
      );
}

class RestaurantStats {
  final StatsWindow today;
  final StatsWindow last7Days;
  final int activeOrders;

  RestaurantStats({required this.today, required this.last7Days, required this.activeOrders});

  factory RestaurantStats.fromJson(Map<String, dynamic> json) => RestaurantStats(
        today: StatsWindow.fromJson(json['today'] ?? const {}),
        last7Days: StatsWindow.fromJson(json['last7Days'] ?? const {}),
        activeOrders: (json['activeOrders'] as num?)?.toInt() ?? 0,
      );
}
