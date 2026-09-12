class MenuItemAddon {
  final String id;
  final String name;
  final double price;

  MenuItemAddon({required this.id, required this.name, required this.price});

  factory MenuItemAddon.fromJson(Map<String, dynamic> json) =>
      MenuItemAddon(id: json['id'] ?? '', name: json['name'], price: (json['price'] as num).toDouble());
}

class MenuItem {
  final String id;
  final String? categoryId;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final bool isVeg;
  final bool isAvailable;
  final List<MenuItemAddon> addons;

  MenuItem({
    required this.id,
    this.categoryId,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    required this.isVeg,
    required this.isAvailable,
    required this.addons,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'],
        categoryId: json['categoryId'],
        name: json['name'],
        description: json['description'],
        price: (json['price'] as num).toDouble(),
        imageUrl: json['imageUrl'],
        isVeg: json['isVeg'] ?? true,
        isAvailable: json['isAvailable'] ?? true,
        addons: (json['addons'] as List<dynamic>? ?? []).map((a) => MenuItemAddon.fromJson(a)).toList(),
      );
}

class MenuCategory {
  final String id;
  final String name;
  final int sortOrder;

  MenuCategory({required this.id, required this.name, required this.sortOrder});

  factory MenuCategory.fromJson(Map<String, dynamic> json) =>
      MenuCategory(id: json['id'], name: json['name'], sortOrder: json['sortOrder'] ?? 0);
}

class PartnerRestaurant {
  final String id;
  final String name;
  final String? description;
  final String? cuisineTags;
  final String? imageUrl;
  final String status;
  final bool isOpen;
  final int avgDeliveryTimeMin;
  final double deliveryFee;
  final double packagingFee;
  final double minOrderAmount;
  final double ratingAvg;
  final int ratingCount;
  final List<MenuCategory> menuCategories;
  final List<MenuItem> menuItems;

  PartnerRestaurant({
    required this.id,
    required this.name,
    this.description,
    this.cuisineTags,
    this.imageUrl,
    required this.status,
    required this.isOpen,
    required this.avgDeliveryTimeMin,
    required this.deliveryFee,
    required this.packagingFee,
    required this.minOrderAmount,
    required this.ratingAvg,
    required this.ratingCount,
    this.menuCategories = const [],
    this.menuItems = const [],
  });

  factory PartnerRestaurant.fromJson(Map<String, dynamic> json) => PartnerRestaurant(
        id: json['id'],
        name: json['name'],
        description: json['description'],
        cuisineTags: json['cuisineTags'],
        imageUrl: json['imageUrl'],
        status: json['status'] ?? 'PENDING',
        isOpen: json['isOpen'] ?? true,
        avgDeliveryTimeMin: json['avgDeliveryTimeMin'] ?? 30,
        deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0,
        packagingFee: (json['packagingFee'] as num?)?.toDouble() ?? 0,
        minOrderAmount: (json['minOrderAmount'] as num?)?.toDouble() ?? 0,
        ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 0,
        ratingCount: json['ratingCount'] ?? 0,
        menuCategories: (json['menuCategories'] as List<dynamic>? ?? []).map((c) => MenuCategory.fromJson(c)).toList(),
        menuItems: (json['menuItems'] as List<dynamic>? ?? []).map((i) => MenuItem.fromJson(i)).toList(),
      );
}
