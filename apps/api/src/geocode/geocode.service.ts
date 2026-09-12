import { BadGatewayException, Injectable } from "@nestjs/common";

// Nominatim's usage policy requires a real identifying User-Agent and caps
// anonymous usage at ~1 req/sec — fine for a demo, proxied server-side so the
// browser never needs a key and we can rate-limit/cache here later if needed.
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "GlidoApp/0.1 (demo project; contact: admin@glido.app)";

@Injectable()
export class GeocodeService {
  async reverse(lat: number, lng: number) {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new BadGatewayException("Could not look up that location.");
    const data = (await res.json()) as { display_name?: string };
    return { address: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }

  async search(query: string) {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new BadGatewayException("Could not search for that location.");
    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return data.map((r) => ({ address: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
  }
}
