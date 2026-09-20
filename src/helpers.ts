const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

export function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasCoordinates(value: { longitude: number | null; latitude: number | null }): boolean {
  return isFiniteCoordinate(value.longitude) && isFiniteCoordinate(value.latitude) &&
    value.longitude >= -180 && value.longitude <= 180 &&
    value.latitude >= -85.051129 && value.latitude <= 85.051129;
}

export function normalizeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function distanceMeters(
  left: { longitude: number; latitude: number },
  right: { longitude: number; latitude: number },
): number {
  const radius = 6_371_008.8;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const latitude1 = toRadians(left.latitude);
  const latitude2 = toRadians(right.latitude);
  const a = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function encodeTime(timestamp: number): string {
  let value = Math.max(0, Math.floor(timestamp));
  let output = "";
  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

function randomChars(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => CROCKFORD[value % 32]).join("");
}

export function createPlaceId(now = Date.now()): string {
  return `plc_${encodeTime(now)}${randomChars(16)}`;
}

export function safeFileStem(value: string): string {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#\[\]^]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, "");
  return cleaned.slice(0, 80) || "未命名地点";
}

export function extractExcerpt(markdown: string, limit = 160): string {
  const body = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, "$2 $1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~=`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return body.length > limit ? `${body.slice(0, limit).trimEnd()}…` : body;
}

export function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

export function parseMarkerIcon(value: string): { kind: "lucide" | "emoji"; value: string } {
  const normalized = value.trim();
  if (normalized.startsWith("emoji:") && normalized.slice(6).trim()) {
    return { kind: "emoji", value: normalized.slice(6).trim() };
  }
  if (normalized.startsWith("lucide:") && normalized.slice(7).trim()) {
    return { kind: "lucide", value: normalized.slice(7).trim() };
  }
  return { kind: "lucide", value: "map-pin" };
}

export function boundsAround(longitude: number, latitude: number, meters: number): {
  southWest: [number, number];
  northEast: [number, number];
} {
  const latitudeDelta = meters / 111_320;
  const longitudeDelta = meters / (111_320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));
  return {
    southWest: [longitude - longitudeDelta, latitude - latitudeDelta],
    northEast: [longitude + longitudeDelta, latitude + latitudeDelta],
  };
}

export function zoomForRadius(
  latitude: number,
  radiusMeters: number,
  widthPixels: number,
  heightPixels: number,
): number {
  const usablePixels = Math.max(220, Math.min(widthPixels, heightPixels) - 72);
  const metersPerPixel = Math.max(1, radiusMeters * 2 / usablePixels);
  const worldResolution = 156_543.03392 * Math.max(0.2, Math.cos(latitude * Math.PI / 180));
  return Math.max(3, Math.min(20, Math.log2(worldResolution / metersPerPixel)));
}

export function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
