class RestaurantSettings {
  final String restaurantName;
  final String upiId;
  final String upiPayeeName;
  final String? contactPhone;
  final String? address;
  final String? openingHours;
  final bool isStoreOpen;
  final double minOrderAmount;
  final int defaultPrepTimeMinutes;
  final double freeDeliveryRadiusKm;
  final double? restaurantLat;
  final double? restaurantLng;
  final String? fssaiLicenseNumber;
  final bool isEmailMandatory;
  final bool enableEmailNotifications;
  final String? headerLogoUrl;
  final String? websiteTagline;
  final String? categoryActiveColor;
  final String? categoryInactiveColor;

  RestaurantSettings({
    this.restaurantName = 'Swadeep Cake Shop & Restaurant',
    this.upiId = '8210344498@okbizaxis',
    this.upiPayeeName = 'Swadeep Cake Shop',
    this.contactPhone = '+91 8210344498',
    this.address = 'Main Road, Gidhaur, Jamui, Bihar - 811305',
    this.openingHours = '08:00 AM - 10:00 PM',
    this.isStoreOpen = true,
    this.minOrderAmount = 0.0,
    this.defaultPrepTimeMinutes = 25,
    this.freeDeliveryRadiusKm = 5.0,
    this.restaurantLat = 24.8624,
    this.restaurantLng = 86.1843,
    this.fssaiLicenseNumber = '20426191000010',
    this.isEmailMandatory = false,
    this.enableEmailNotifications = true,
    this.headerLogoUrl,
    this.websiteTagline = 'Freshly Baked Every Morning',
    this.categoryActiveColor,
    this.categoryInactiveColor,
  });

  factory RestaurantSettings.fromMap(Map<String, dynamic> map) {
    return RestaurantSettings(
      restaurantName: map['restaurantName']?.toString() ?? 'Swadeep Cake Shop & Restaurant',
      upiId: map['upiId']?.toString() ?? '8210344498@okbizaxis',
      upiPayeeName: map['upiPayeeName']?.toString() ?? 'Swadeep Cake Shop',
      contactPhone: map['contactPhone']?.toString() ?? '+91 8210344498',
      address: map['address']?.toString() ?? 'Main Road, Gidhaur, Jamui, Bihar - 811305',
      openingHours: map['openingHours']?.toString() ?? '08:00 AM - 10:00 PM',
      isStoreOpen: map['isStoreOpen'] as bool? ?? true,
      minOrderAmount: (map['minOrderAmount'] as num?)?.toDouble() ?? 0.0,
      defaultPrepTimeMinutes: (map['defaultPrepTimeMinutes'] as num?)?.toInt() ?? 25,
      freeDeliveryRadiusKm: (map['freeDeliveryRadiusKm'] as num?)?.toDouble() ?? 5.0,
      restaurantLat: (map['restaurantLat'] as num?)?.toDouble() ?? 24.8624,
      restaurantLng: (map['restaurantLng'] as num?)?.toDouble() ?? 86.1843,
      fssaiLicenseNumber: map['fssaiLicenseNumber']?.toString() ?? '20426191000010',
      isEmailMandatory: map['isEmailMandatory'] as bool? ?? false,
      enableEmailNotifications: map['enableEmailNotifications'] as bool? ?? true,
      headerLogoUrl: map['headerLogoUrl']?.toString(),
      websiteTagline: map['websiteTagline']?.toString() ?? 'Freshly Baked Every Morning',
      categoryActiveColor: map['categoryActiveColor']?.toString(),
      categoryInactiveColor: map['categoryInactiveColor']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'restaurantName': restaurantName,
      'upiId': upiId,
      'upiPayeeName': upiPayeeName,
      'contactPhone': contactPhone,
      'address': address,
      'openingHours': openingHours,
      'isStoreOpen': isStoreOpen,
      'minOrderAmount': minOrderAmount,
      'defaultPrepTimeMinutes': defaultPrepTimeMinutes,
      'freeDeliveryRadiusKm': freeDeliveryRadiusKm,
      'restaurantLat': restaurantLat,
      'restaurantLng': restaurantLng,
      'fssaiLicenseNumber': fssaiLicenseNumber,
      'isEmailMandatory': isEmailMandatory,
      'enableEmailNotifications': enableEmailNotifications,
      if (headerLogoUrl != null) 'headerLogoUrl': headerLogoUrl,
      if (websiteTagline != null) 'websiteTagline': websiteTagline,
      if (categoryActiveColor != null) 'categoryActiveColor': categoryActiveColor,
      if (categoryInactiveColor != null) 'categoryInactiveColor': categoryInactiveColor,
    };
  }
}
