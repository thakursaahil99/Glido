/// Real delivered-order counts/earnings for the signed-in partner, from
/// GET /delivery-partner/me/stats — never fabricated client-side.
class PartnerStatsWindow {
  final int deliveries;
  final double earnings;

  PartnerStatsWindow({required this.deliveries, required this.earnings});

  factory PartnerStatsWindow.fromJson(Map<String, dynamic> json) => PartnerStatsWindow(
        deliveries: (json['deliveries'] as num?)?.toInt() ?? 0,
        earnings: (json['earnings'] as num?)?.toDouble() ?? 0,
      );
}

class PartnerStats {
  final PartnerStatsWindow today;
  final PartnerStatsWindow last7Days;

  PartnerStats({required this.today, required this.last7Days});

  factory PartnerStats.fromJson(Map<String, dynamic> json) => PartnerStats(
        today: PartnerStatsWindow.fromJson(json['today'] ?? const {}),
        last7Days: PartnerStatsWindow.fromJson(json['last7Days'] ?? const {}),
      );
}
