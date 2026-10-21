enum StaffRole {
  admin,
  kitchen,
  preparing,
  delivery;

  static StaffRole fromString(String val) {
    switch (val.toLowerCase()) {
      case 'kitchen':
        return StaffRole.kitchen;
      case 'preparing':
        return StaffRole.preparing;
      case 'delivery':
        return StaffRole.delivery;
      case 'admin':
      default:
        return StaffRole.admin;
    }
  }

  String toRoleString() {
    switch (this) {
      case StaffRole.kitchen:
        return 'kitchen';
      case StaffRole.preparing:
        return 'preparing';
      case StaffRole.delivery:
        return 'delivery';
      case StaffRole.admin:
        return 'admin';
    }
  }
}

class StaffUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final StaffRole role;
  final String? vehicleType;
  final String? vehicleNumber;

  StaffUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.vehicleType,
    this.vehicleNumber,
  });

  factory StaffUser.fromMap(Map<String, dynamic> map, String id, StaffRole role) {
    return StaffUser(
      id: id,
      name: map['name']?.toString() ?? '',
      email: map['email']?.toString() ?? '',
      phone: map['phone']?.toString(),
      role: role,
      vehicleType: map['vehicleType']?.toString(),
      vehicleNumber: map['vehicleNumber']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'email': email,
      if (phone != null) 'phone': phone,
      'role': role.toRoleString(),
      if (vehicleType != null) 'vehicleType': vehicleType,
      if (vehicleNumber != null) 'vehicleNumber': vehicleNumber,
    };
  }
}
