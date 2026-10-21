import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design_system/motion_tokens.dart';

class AnimatedTapBuilder extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scaleDown;
  final bool enableHaptics;

  const AnimatedTapBuilder({
    super.key,
    required this.child,
    this.onTap,
    this.scaleDown = MotionTokens.activeTapScale,
    this.enableHaptics = true,
  });

  @override
  State<AnimatedTapBuilder> createState() => _AnimatedTapBuilderState();
}

class _AnimatedTapBuilderState extends State<AnimatedTapBuilder> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails _) {
    if (widget.onTap == null) return;
    setState(() => _isPressed = true);
    if (widget.enableHaptics) {
      HapticFeedback.lightImpact();
    }
  }

  void _handleTapUp(TapUpDetails _) {
    if (widget.onTap == null) return;
    setState(() => _isPressed = false);
    widget.onTap?.call();
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _isPressed ? widget.scaleDown : 1.0,
        duration: MotionTokens.fast,
        curve: MotionTokens.standard,
        child: widget.child,
      ),
    );
  }
}
