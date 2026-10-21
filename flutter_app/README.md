# Swadeep Cake Shop & Restaurant - Flutter Mobile Application

A complete production-grade Flutter application ported from the Swadeep Cake Shop web app.

## Project Structure
- `lib/config/`: Firebase configuration (`AppFirebaseConfig`) targeting the exact same database (`ai-studio-swadeep-c9f5f4f9-12f6-4ef3-a3b0-884128973d8b`).
- `lib/data/models/`: Strongly typed Dart data models (`Product`, `Order`, `CartItem`, `RestaurantSettings`, `StaffUser`).
- `lib/data/services/`: Firestore services with quota-safe reading (`ProductService`, `OrderService`, `SettingsService`, `LocalStorageService`).
- `lib/logic/`: Riverpod state providers for shopping cart, catalog filtering, and categories.
- `lib/ui/features/`:
  - `home/`: Storefront with animated category chips, search bar, and 60fps product cards.
  - `product_detail/`: Bottom sheet with instant variant and extra topping price calculations.
  - `cart/`: Slide-over cart summary.
  - `checkout/`: Delivery details and COD / UPI payment flow.
  - `track_order/`: Real-time order progress timeline with delivery rider contact buttons.
  - `portals/`:
    - `staff_login_screen.dart`: Multi-role login.
    - `admin/`: Admin operations dashboard (orders, stock availability, settings).
    - `kitchen/`: Kitchen Display System (KDS) for chef with item ticking.
    - `preparing/`: Packing station screen for party props and cakes.
    - `delivery/`: Rider delivery portal with customer call and map directions.

## How to Run
1. Open this folder in VS Code or Android Studio.
2. In terminal run:
   ```bash
   flutter pub get
   flutter run
   ```
3. To build an Android APK:
   ```bash
   flutter build apk --release
   ```
