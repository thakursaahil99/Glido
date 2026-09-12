class GlidoBanner {
  final String id;
  final String title;
  final String imageUrl;
  final String? link;

  GlidoBanner({required this.id, required this.title, required this.imageUrl, this.link});

  factory GlidoBanner.fromJson(Map<String, dynamic> json) =>
      GlidoBanner(id: json['id'], title: json['title'], imageUrl: json['imageUrl'], link: json['link']);
}
