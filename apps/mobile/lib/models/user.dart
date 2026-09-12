class GlidoUser {
  final String id;
  final String? name;
  final String? email;
  final String? phone;
  final String role;

  GlidoUser({required this.id, this.name, this.email, this.phone, required this.role});

  factory GlidoUser.fromJson(Map<String, dynamic> json) => GlidoUser(
        id: json['id'],
        name: json['name'],
        email: json['email'],
        phone: json['phone'],
        role: json['role'],
      );
}

class Address {
  final String id;
  final String label;
  final String line1;
  final String? line2;
  final String? pincode;
  final bool isDefault;
  final String? instructions;

  Address({
    required this.id,
    required this.label,
    required this.line1,
    this.line2,
    this.pincode,
    required this.isDefault,
    this.instructions,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'],
        label: json['label'] ?? '',
        line1: json['line1'] ?? '',
        line2: json['line2'],
        pincode: json['pincode'],
        isDefault: json['isDefault'] ?? false,
        instructions: json['instructions'],
      );

  String get full => '$line1${line2 != null && line2!.isNotEmpty ? ', $line2' : ''}';
}
