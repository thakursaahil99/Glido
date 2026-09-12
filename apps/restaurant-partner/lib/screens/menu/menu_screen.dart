import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/restaurant.dart';
import '../../widgets/error_state.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  PartnerRestaurant? _restaurant;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>('/partner/restaurant');
      setState(() => _restaurant = PartnerRestaurant.fromJson(res));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _addCategory() async {
    final ctrl = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add category'),
        content: TextField(controller: ctrl, autofocus: true, decoration: const InputDecoration(labelText: 'Category name')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: const Text('Add')),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    try {
      await ApiClient.instance.post('/partner/restaurant/categories', {'name': name});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _deleteCategory(String id) async {
    try {
      await ApiClient.instance.delete('/partner/restaurant/categories/$id');
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _toggleAvailability(MenuItem item) async {
    try {
      await ApiClient.instance.patch('/partner/restaurant/items/${item.id}', {'isAvailable': !item.isAvailable});
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _deleteItem(String id) async {
    try {
      await ApiClient.instance.delete('/partner/restaurant/items/$id');
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _addItem() async {
    if (_restaurant == null) return;
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    String? categoryId;
    bool isVeg = true;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Add menu item'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Item name')),
                const SizedBox(height: 8),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
                const SizedBox(height: 8),
                TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price (₹)')),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: categoryId,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Uncategorized')),
                    ..._restaurant!.menuCategories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                  ],
                  onChanged: (v) => setDialogState(() => categoryId = v),
                ),
                SwitchListTile(
                  title: const Text('Vegetarian'),
                  value: isVeg,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setDialogState(() => isVeg = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Add')),
          ],
        ),
      ),
    );

    if (result != true || nameCtrl.text.trim().isEmpty) return;
    try {
      await ApiClient.instance.post('/partner/restaurant/items', {
        'name': nameCtrl.text.trim(),
        'description': descCtrl.text.trim(),
        'price': double.tryParse(priceCtrl.text) ?? 0,
        'categoryId': categoryId,
        'isVeg': isVeg,
      });
      _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
      body: _error != null
          ? ErrorStateView(message: _error!, onRetry: _load)
          : _restaurant == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Text('Categories', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const Spacer(),
                          TextButton.icon(onPressed: _addCategory, icon: const Icon(Icons.add, size: 18), label: const Text('Add')),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_restaurant!.menuCategories.isEmpty)
                        Text('No categories yet.', style: TextStyle(color: GlidoColors.muted, fontSize: 13))
                      else
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _restaurant!.menuCategories
                              .map((c) => Chip(
                                    label: Text(c.name),
                                    onDeleted: () => _deleteCategory(c.id),
                                    backgroundColor: GlidoColors.primaryLight,
                                  ))
                              .toList(),
                        ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Text('Menu items', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          const Spacer(),
                          TextButton.icon(onPressed: _addItem, icon: const Icon(Icons.add, size: 18), label: const Text('Add')),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_restaurant!.menuItems.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('No menu items yet.', style: TextStyle(color: GlidoColors.muted))),
                        )
                      else
                        ..._restaurant!.menuItems.map((item) => Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: glidoCardShadow(),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 16,
                                    height: 16,
                                    decoration: BoxDecoration(
                                      border: Border.all(color: item.isVeg ? GlidoColors.success : GlidoColors.danger, width: 1.5),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                    child: Center(
                                      child: Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: item.isVeg ? GlidoColors.success : GlidoColors.danger,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                        Text('₹${item.price.toStringAsFixed(0)}', style: TextStyle(color: GlidoColors.muted, fontSize: 12.5)),
                                      ],
                                    ),
                                  ),
                                  TextButton(
                                    onPressed: () => _toggleAvailability(item),
                                    child: Text(
                                      item.isAvailable ? 'Available' : 'Unavailable',
                                      style: TextStyle(color: item.isAvailable ? GlidoColors.success : GlidoColors.danger, fontSize: 12.5, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.delete_outline, color: GlidoColors.danger, size: 20),
                                    onPressed: () => _deleteItem(item.id),
                                  ),
                                ],
                              ),
                            )),
                    ],
                  ),
                ),
    );
  }
}
