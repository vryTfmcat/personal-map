import type { TFile } from "obsidian";

export const DEFAULT_PLACES_FOLDER = "50_实体/地点/外部地点";
export const DEFAULT_CONFIG_PATH = "30_项目/个人地图/配置/地图配置.md";

export interface AMapCredentials {
  key: string;
  securityCode: string;
}

export interface MapConfig {
  placesFolder: string;
  centerPlace: string;
  initialRadiusMeters: number;
  searchRadiusMeters: number;
  panLimitMeters: number;
  showHomeMarker: boolean;
}

export interface PlaceRecord {
  file: TFile;
  placeId: string;
  title: string;
  address: string;
  amapPoiId: string;
  longitude: number | null;
  latitude: number | null;
  coordinateSystem: "GCJ-02";
  placeType: string;
  markerIcon: string;
  markerColor: string;
  home: boolean;
  privacy: string;
  source: string;
  tags: string[];
  excerpt: string;
  created: string;
  updated: string;
}

export interface PlaceDraft {
  title: string;
  address: string;
  amapPoiId: string;
  longitude: number;
  latitude: number;
  placeType: string;
  markerIcon: string;
  markerColor: string;
  source: string;
  home?: boolean;
}

export interface SearchCandidate extends PlaceDraft {
  distance: number | null;
}

export interface RecentStyle {
  placeType: string;
  markerIcon: string;
  markerColor: string;
}

export interface PersonalMapPluginApi {
  getCredentials(): AMapCredentials;
  setCredentials(credentials: AMapCredentials): void;
  activateView(): Promise<void>;
}

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}
