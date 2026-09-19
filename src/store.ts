import { App, normalizePath, TFile } from "obsidian";
import {
  createPlaceId,
  distanceMeters,
  extractExcerpt,
  formatLocalDate,
  hasCoordinates,
  isFiniteCoordinate,
  normalizeTags,
  normalizeText,
  safeFileStem,
} from "./helpers";
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_PLACES_FOLDER,
  type MapConfig,
  type PlaceDraft,
  type PlaceRecord,
  type RecentStyle,
} from "./types";

const DEFAULT_CONFIG: MapConfig = {
  placesFolder: DEFAULT_PLACES_FOLDER,
  centerPlace: "",
  initialRadiusMeters: 3000,
  searchRadiusMeters: 5000,
  panLimitMeters: 5000,
  showHomeMarker: true,
};

function frontmatterString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function frontmatterNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function frontmatterBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = frontmatterNumber(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function serializeTags(tags: string[]): string[] {
  const unique = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  return unique.length ? ["tags:", ...unique.map((tag) => `  - ${yamlString(tag)}`)] : ["tags: []"];
}

function serializePlaceNote(placeId: string, draft: PlaceDraft): string {
  const today = formatLocalDate();
  const tags = ["个人地图/地点"];
  if (draft.placeType.trim()) tags.push(draft.placeType.trim());
  return [
    "---",
    "personalMapPlace: true",
    "entityType: place",
    "schemaVersion: 1",
    `placeId: ${yamlString(placeId)}`,
    `title: ${yamlString(draft.title.trim())}`,
    "aliases: []",
    `address: ${yamlString(draft.address.trim())}`,
    `amapPoiId: ${yamlString(draft.amapPoiId.trim())}`,
    `longitude: ${draft.longitude.toFixed(6)}`,
    `latitude: ${draft.latitude.toFixed(6)}`,
    "coordinateSystem: GCJ-02",
    `placeType: ${yamlString(draft.home ? "residence" : "custom")}`,
    `mapType: ${yamlString(draft.placeType.trim())}`,
    `markerIcon: ${yamlString(draft.markerIcon.trim() || "lucide:map-pin")}`,
    `markerColor: ${yamlString(draft.markerColor.trim() || "#2563eb")}`,
    `home: ${draft.home === true}`,
    "privacy: private",
    `source: ${yamlString(draft.source.trim() || "manual")}`,
    `created: ${today}`,
    `updated: ${today}`,
    ...serializeTags(["实体/地点", ...tags]),
    "---",
    "",
    `# ${draft.title.trim()}`,
    "",
    "## 个人经验",
    "",
    "",
  ].join("\n");
}

export class PersonalMapStore {
  constructor(private readonly app: App) {}

  async ensureFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    if (this.app.vault.getAbstractFileByPath(normalized)) return;
    const segments = normalized.split("/");
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
    }
  }

  async loadConfig(): Promise<MapConfig> {
    const file = this.app.vault.getAbstractFileByPath(DEFAULT_CONFIG_PATH);
    if (!(file instanceof TFile)) return { ...DEFAULT_CONFIG };
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    return {
      placesFolder: frontmatterString(frontmatter.placesFolder, DEFAULT_CONFIG.placesFolder),
      centerPlace: frontmatterString(frontmatter.centerPlace, DEFAULT_CONFIG.centerPlace),
      initialRadiusMeters: positiveNumber(frontmatter.initialRadiusMeters, DEFAULT_CONFIG.initialRadiusMeters),
      searchRadiusMeters: positiveNumber(frontmatter.searchRadiusMeters, DEFAULT_CONFIG.searchRadiusMeters),
      panLimitMeters: positiveNumber(frontmatter.panLimitMeters, DEFAULT_CONFIG.panLimitMeters),
      showHomeMarker: frontmatterBoolean(frontmatter.showHomeMarker, DEFAULT_CONFIG.showHomeMarker),
    };
  }

  async loadPlaces(config: MapConfig): Promise<PlaceRecord[]> {
    const prefix = `${normalizePath(config.placesFolder)}/`;
    const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
    const centerTarget = config.centerPlace.match(/^\[\[([^|\]]+)/)?.[1]?.trim();
    if (centerTarget) {
      const centerFile = this.app.metadataCache.getFirstLinkpathDest(centerTarget, DEFAULT_CONFIG_PATH);
      if (centerFile && !files.some((file) => file.path === centerFile.path)) files.push(centerFile);
    }
    const records: PlaceRecord[] = [];
    for (const file of files) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (frontmatter?.personalMapPlace !== true) continue;
      const content = await this.app.vault.cachedRead(file);
      const longitude = frontmatterNumber(frontmatter.longitude);
      const latitude = frontmatterNumber(frontmatter.latitude);
      records.push({
        file,
        placeId: frontmatterString(frontmatter.placeId),
        title: frontmatterString(frontmatter.title, file.basename),
        address: frontmatterString(frontmatter.address),
        amapPoiId: frontmatterString(frontmatter.amapPoiId),
        longitude,
        latitude,
        coordinateSystem: "GCJ-02",
        placeType: frontmatterString(
          frontmatter.mapType,
          frontmatterString(frontmatter.placeType) === "residence" ? "住宅" : "",
        ),
        markerIcon: frontmatterString(frontmatter.markerIcon, "lucide:map-pin"),
        markerColor: frontmatterString(frontmatter.markerColor, "#2563eb"),
        home: frontmatterBoolean(frontmatter.home),
        privacy: frontmatterString(frontmatter.privacy, "private"),
        source: frontmatterString(frontmatter.source, "manual"),
        tags: normalizeTags(frontmatter.tags),
        excerpt: extractExcerpt(content),
        created: frontmatterString(frontmatter.created),
        updated: frontmatterString(frontmatter.updated),
      });
    }
    return records.sort((left, right) => Number(right.home) - Number(left.home) || left.title.localeCompare(right.title, "zh-CN"));
  }

  getRecentStyles(places: PlaceRecord[], limit = 8): RecentStyle[] {
    const seen = new Set<string>();
    const result: RecentStyle[] = [];
    const sorted = [...places].sort((left, right) => right.updated.localeCompare(left.updated));
    for (const place of sorted) {
      const style: RecentStyle = {
        placeType: place.placeType,
        markerIcon: place.markerIcon,
        markerColor: place.markerColor,
      };
      const key = JSON.stringify(style);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(style);
      if (result.length >= limit) break;
    }
    return result;
  }

  findDuplicates(draft: PlaceDraft, places: PlaceRecord[]): PlaceRecord[] {
    if (draft.amapPoiId) {
      const exact = places.filter((place) => place.amapPoiId === draft.amapPoiId);
      if (exact.length) return exact;
    }
    const normalizedName = normalizeText(draft.title);
    return places.filter((place) => {
      if (!hasCoordinates(place)) return false;
      if (normalizeText(place.title) !== normalizedName) return false;
      return distanceMeters(
        { longitude: draft.longitude, latitude: draft.latitude },
        { longitude: place.longitude as number, latitude: place.latitude as number },
      ) <= 30;
    });
  }

  async createPlace(config: MapConfig, draft: PlaceDraft): Promise<PlaceRecord> {
    await this.ensureFolder(config.placesFolder);
    const placeId = createPlaceId();
    const suffix = placeId.slice(-6);
    const stem = safeFileStem(draft.title);
    let path = normalizePath(`${config.placesFolder}/${stem}-${suffix}.md`);
    let index = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${config.placesFolder}/${stem}-${suffix}-${index}.md`);
      index += 1;
    }
    const file = await this.app.vault.create(path, serializePlaceNote(placeId, draft));
    const loaded = (await this.loadPlaces(config)).find((place) => place.file.path === file.path);
    if (!loaded) {
      return {
        file,
        placeId,
        title: draft.title,
        address: draft.address,
        amapPoiId: draft.amapPoiId,
        longitude: draft.longitude,
        latitude: draft.latitude,
        coordinateSystem: "GCJ-02",
        placeType: draft.placeType,
        markerIcon: draft.markerIcon,
        markerColor: draft.markerColor,
        home: draft.home === true,
        privacy: "private",
        source: draft.source,
        tags: ["个人地图/地点"],
        excerpt: "",
        created: formatLocalDate(),
        updated: formatLocalDate(),
      };
    }
    return loaded;
  }

  async updatePlace(place: PlaceRecord, draft: PlaceDraft): Promise<void> {
    await this.app.fileManager.processFrontMatter(place.file, (frontmatter) => {
      frontmatter.personalMapPlace = true;
      frontmatter.entityType = "place";
      frontmatter.schemaVersion = 1;
      frontmatter.placeId = place.placeId || createPlaceId();
      frontmatter.title = draft.title.trim();
      frontmatter.address = draft.address.trim();
      frontmatter.amapPoiId = draft.amapPoiId.trim();
      frontmatter.longitude = Number(draft.longitude.toFixed(6));
      frontmatter.latitude = Number(draft.latitude.toFixed(6));
      frontmatter.coordinateSystem = "GCJ-02";
      frontmatter.placeType = draft.home === true || place.home ? "residence" : "custom";
      frontmatter.mapType = draft.placeType.trim();
      frontmatter.markerIcon = draft.markerIcon.trim() || "lucide:map-pin";
      frontmatter.markerColor = draft.markerColor.trim() || "#2563eb";
      frontmatter.home = draft.home === true || place.home;
      frontmatter.privacy = place.privacy || "private";
      frontmatter.source = draft.source.trim() || place.source || "manual";
      frontmatter.updated = formatLocalDate();
      const tags = normalizeTags(frontmatter.tags);
      if (!tags.includes("实体/地点")) tags.unshift("实体/地点");
      if (!tags.includes("个人地图/地点")) tags.unshift("个人地图/地点");
      frontmatter.tags = tags;
    });
  }

  async deletePlace(place: PlaceRecord): Promise<void> {
    await this.app.vault.trash(place.file, true);
  }

  async openPlace(place: PlaceRecord): Promise<void> {
    await this.app.workspace.getLeaf(false).openFile(place.file);
  }

  findHome(places: PlaceRecord[]): PlaceRecord | null {
    return places.find((place) => place.home) ?? null;
  }

  coordinatesReady(place: PlaceRecord | null): place is PlaceRecord & { longitude: number; latitude: number } {
    return Boolean(place && isFiniteCoordinate(place.longitude) && isFiniteCoordinate(place.latitude));
  }
}
