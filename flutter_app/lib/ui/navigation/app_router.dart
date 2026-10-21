import 'package:go_router/go_router.dart';
import '../features/checkout/checkout_screen.dart';
import '../features/home/home_screen.dart';
import '../features/portals/admin/admin_dashboard_screen.dart';
import '../features/portals/delivery/delivery_agent_screen.dart';
import '../features/portals/kitchen/kitchen_display_screen.dart';
import '../features/portals/preparing/preparing_display_screen.dart';
import '../features/portals/staff_login_screen.dart';
import '../features/track_order/track_order_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/checkout',
      builder: (context, state) => const CheckoutScreen(),
    ),
    GoRoute(
      path: '/track_order/:orderId',
      builder: (context, state) {
        final orderId = state.pathParameters['orderId'] ?? '';
        final phone = state.uri.queryParameters['phone'];
        return TrackOrderScreen(orderId: orderId, phone: phone);
      },
    ),
    GoRoute(
      path: '/staff_login',
      builder: (context, state) => const StaffLoginScreen(),
    ),
    GoRoute(
      path: '/admin',
      builder: (context, state) => const AdminDashboardScreen(),
    ),
    GoRoute(
      path: '/kitchen',
      builder: (context, state) => const KitchenDisplayScreen(),
    ),
    GoRoute(
      path: '/preparing',
      builder: (context, state) => const PreparingDisplayScreen(),
    ),
    GoRoute(
      path: '/delivery',
      builder: (context, state) => const DeliveryAgentScreen(),
    ),
  ],
);
