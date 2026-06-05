/** [lng, lat] — the order maplibre-gl expects. Sofia city center. */
export const SOFIA_CENTER: [number, number] = [23.3219, 42.6977];

export function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

export function clampLng(lng: number): number {
  return Math.max(-180, Math.min(180, lng));
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}
