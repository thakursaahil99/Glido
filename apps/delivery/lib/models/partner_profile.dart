class PartnerProfile {
  final String id;
  final String name;
  final String phone;
  final String vehicleType;
  final String? vehicleNumber;
  final String status;
  final bool isOnline;
  final bool isAvailable;
  final double? currentLat;
  final double? currentLng;
  final double ratingAvg;
  final int ratingCount;

  PartnerProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.vehicleType,
    this.vehicleNumber,
    required this.status,
    required this.isOnline,
    required this.isAvailable,
    this.currentLat,
    this.currentLng,
    required this.ratingAvg,
    required this.ratingCount,
  });

  factory PartnerProfile.fromJson(Map<String, dynamic> json) => PartnerProfile(
        id: json['id'],
        name: json['name'],
        phone: json['phone'],
        vehicleType: json['vehicleType'] ?? 'Bike',
        vehicleNumber: json['vehicleNumber'],
        status: json['status'],
        isOnline: json['isOnline'] ?? false,
        isAvailable: json['isAvailable'] ?? true,
        currentLat: (json['currentLat'] as num?)?.toDouble(),
        currentLng: (json['currentLng'] as num?)?.toDouble(),
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 5,
        ratingCount: json['ratingCount'] ?? 0,
      );
}
