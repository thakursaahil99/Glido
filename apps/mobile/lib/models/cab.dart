class RideType {
  final String id;
  final String name;
  final String? imageUrl;
  final double baseFare;
  final double perKmFare;
  final double perMinuteFare;
  final double minFare;
  final int capacity;

  RideType({
    required this.id,
    required this.name,
    this.imageUrl,
    required this.baseFare,
    required this.perKmFare,
    required this.perMinuteFare,
    required this.minFare,
    required this.capacity,
  });

  factory RideType.fromJson(Map<String, dynamic> json) => RideType(
        id: json['id'],
        name: json['name'],
        imageUrl: json['imageUrl'],
        baseFare: (json['baseFare'] as num).toDouble(),
        perKmFare: (json['perKmFare'] as num).toDouble(),
        perMinuteFare: (json['perMinuteFare'] as num).toDouble(),
        minFare: (json['minFare'] as num).toDouble(),
        capacity: json['capacity'] ?? 1,
      );
}

class RideDriver {
  final String name;
  final String phone;
  final String? vehicleModel;
  final String vehicleNumber;
  final double ratingAvg;
  final double? currentLat;
  final double? currentLng;

  RideDriver({
    required this.name,
    required this.phone,
    this.vehicleModel,
    required this.vehicleNumber,
    required this.ratingAvg,
    this.currentLat,
    this.currentLng,
  });

  factory RideDriver.fromJson(Map<String, dynamic> json) => RideDriver(
        name: json['name'],
        phone: json['phone'],
        vehicleModel: json['vehicleModel'],
        vehicleNumber: json['vehicleNumber'],
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 5,
        currentLat: (json['currentLat'] as num?)?.toDouble(),
        currentLng: (json['currentLng'] as num?)?.toDouble(),
      );
}

class RideReview {
  final String id;
  final int rating;
  final String? comment;

  RideReview({required this.id, required this.rating, this.comment});

  factory RideReview.fromJson(Map<String, dynamic> json) =>
      RideReview(id: json['id'], rating: json['rating'], comment: json['comment']);
}

class RideStatusHistoryEntry {
  final String status;
  final String? note;
  final DateTime changedAt;

  RideStatusHistoryEntry({required this.status, this.note, required this.changedAt});

  factory RideStatusHistoryEntry.fromJson(Map<String, dynamic> json) =>
      RideStatusHistoryEntry(status: json['status'], note: json['note'], changedAt: DateTime.parse(json['changedAt']));
}

class Ride {
  final String id;
  final String rideNumber;
  final String status;
  final String pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final String dropAddress;
  final double dropLat;
  final double dropLng;
  final double distanceKm;
  final double estimatedFare;
  final double? finalFare;
  final double tipAmount;
  final String paymentMethod;
  final String paymentStatus;
  final DateTime createdAt;
  final RideType? rideType;
  final RideDriver? driver;
  final List<RideStatusHistoryEntry> statusHistory;
  final RideReview? review;

  Ride({
    required this.id,
    required this.rideNumber,
    required this.status,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropAddress,
    required this.dropLat,
    required this.dropLng,
    required this.distanceKm,
    required this.estimatedFare,
    this.finalFare,
    this.tipAmount = 0,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.createdAt,
    this.rideType,
    this.driver,
    required this.statusHistory,
    this.review,
  });

  factory Ride.fromJson(Map<String, dynamic> json) => Ride(
        id: json['id'],
        rideNumber: json['rideNumber'],
        status: json['status'],
        pickupAddress: json['pickupAddress'],
        pickupLat: (json['pickupLat'] as num).toDouble(),
        pickupLng: (json['pickupLng'] as num).toDouble(),
        dropAddress: json['dropAddress'],
        dropLat: (json['dropLat'] as num).toDouble(),
        dropLng: (json['dropLng'] as num).toDouble(),
        distanceKm: (json['distanceKm'] as num).toDouble(),
        estimatedFare: (json['estimatedFare'] as num).toDouble(),
        finalFare: (json['finalFare'] as num?)?.toDouble(),
        tipAmount: (json['tipAmount'] as num?)?.toDouble() ?? 0,
        paymentMethod: json['paymentMethod'] ?? 'COD',
        paymentStatus: json['paymentStatus'] ?? 'PENDING',
        createdAt: DateTime.parse(json['createdAt']),
        rideType: json['rideType'] != null ? RideType.fromJson(json['rideType']) : null,
        driver: json['driver'] != null ? RideDriver.fromJson(json['driver']) : null,
        statusHistory:
            (json['statusHistory'] as List<dynamic>? ?? []).map((h) => RideStatusHistoryEntry.fromJson(h)).toList(),
        review: json['review'] != null ? RideReview.fromJson(json['review']) : null,
      );
}

class ServiceCity {
  final String id;
  final String name;
  final double? centerLat;
  final double? centerLng;
  final double serviceRadiusKm;
  final bool isActive;

  ServiceCity({required this.id, required this.name, this.centerLat, this.centerLng, required this.serviceRadiusKm, required this.isActive});

  factory ServiceCity.fromJson(Map<String, dynamic> json) => ServiceCity(
        id: json['id'],
        name: json['name'],
        centerLat: (json['centerLat'] as num?)?.toDouble(),
        centerLng: (json['centerLng'] as num?)?.toDouble(),
        serviceRadiusKm: (json['serviceRadiusKm'] as num?)?.toDouble() ?? 15,
        isActive: json['isActive'] ?? true,
      );
}
