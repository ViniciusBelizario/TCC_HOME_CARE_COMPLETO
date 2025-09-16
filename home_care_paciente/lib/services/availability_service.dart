import 'dart:convert';
import '../core/api_client.dart';

class Slot {
  final int id;
  final int doctorId;
  final DateTime startsAt;
  final DateTime endsAt;

  Slot(
      {required this.id,
      required this.doctorId,
      required this.startsAt,
      required this.endsAt});

  factory Slot.fromJson(Map<String, dynamic> j) => Slot(
        id: j['id'],
        doctorId: j['doctorId'],
        startsAt: DateTime.parse(j['startsAt']).toLocal(),
        endsAt: DateTime.parse(j['endsAt']).toLocal(),
      );
}

class AvailabilityService {
  Future<List<Slot>> list(
      {required int doctorId, DateTime? from, DateTime? to}) async {
    final q = <String, String>{'doctorId': '$doctorId'};
    if (from != null) q['from'] = from.toUtc().toIso8601String();
    if (to != null) q['to'] = to.toUtc().toIso8601String();
    final resp = await ApiClient.I.get('/availability', query: q);
    if (resp.statusCode == 200) {
      final arr = jsonDecode(resp.body) as List;
      return arr.map((e) => Slot.fromJson(e)).toList();
    }
    throw Exception('Erro ao listar disponibilidade (${resp.statusCode})');
  }
}
