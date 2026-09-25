import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/theme.dart';

/// Resolves relative /uploads URLs against the API origin, same as the web
/// app's resolveMediaUrl, and falls back to an icon tile when there's no image.
class GlidoNetworkImage extends StatelessWidget {
  final String? url;
  final IconData icon;
  final BoxFit fit;

  const GlidoNetworkImage({super.key, required this.url, required this.icon, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    final resolved = resolveMediaUrl(url);
    if (resolved == null) {
      return Container(
        color: context.colors.primaryLight,
        child: Icon(icon, color: context.colors.primary, size: 28),
      );
    }
    return Image.network(
      resolved,
      fit: fit,
      width: double.infinity,
      height: double.infinity,
      errorBuilder: (context, error, stackTrace) => Container(
        color: context.colors.primaryLight,
        child: Icon(icon, color: context.colors.primary, size: 28),
      ),
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(color: context.colors.border);
      },
    );
  }
}
