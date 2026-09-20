var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@amap/amap-jsapi-loader/dist/index.js
var require_dist = __commonJS({
  "node_modules/@amap/amap-jsapi-loader/dist/index.js"(exports, module2) {
    "use strict";
    (function(m, p) {
      "object" === typeof exports && "undefined" !== typeof module2 ? module2.exports = p() : "function" === typeof define && define.amd ? define(p) : (m = m || self, m.AMapLoader = p());
    })(exports, function() {
      function m(a) {
        var b2 = [];
        a.AMapUI && b2.push(p(a.AMapUI));
        a.Loca && b2.push(r(a.Loca));
        return Promise.all(b2);
      }
      function p(a) {
        return new Promise(function(h, c) {
          var f = [];
          if (a.plugins) for (var e = 0; e < a.plugins.length; e += 1) -1 == d.AMapUI.plugins.indexOf(a.plugins[e]) && f.push(a.plugins[e]);
          if (g.AMapUI === b.failed) c("\u524D\u6B21\u8BF7\u6C42 AMapUI \u5931\u8D25");
          else if (g.AMapUI === b.notload) {
            g.AMapUI = b.loading;
            d.AMapUI.version = a.version || d.AMapUI.version;
            e = d.AMapUI.version;
            var l = document.body || document.head, k = document.createElement("script");
            k.type = "text/javascript";
            k.src = "https://webapi.amap.com/ui/" + e + "/main.js";
            k.onerror = function(a2) {
              g.AMapUI = b.failed;
              c("\u8BF7\u6C42 AMapUI \u5931\u8D25");
            };
            k.onload = function() {
              g.AMapUI = b.loaded;
              if (f.length) window.AMapUI.loadUI(f, function() {
                for (var a2 = 0, b2 = f.length; a2 < b2; a2++) {
                  var c2 = f[a2].split("/").slice(-1)[0];
                  window.AMapUI[c2] = arguments[a2];
                }
                for (h(); n.AMapUI.length; ) n.AMapUI.splice(0, 1)[0]();
              });
              else for (h(); n.AMapUI.length; ) n.AMapUI.splice(0, 1)[0]();
            };
            l.appendChild(k);
          } else g.AMapUI === b.loaded ? a.version && a.version !== d.AMapUI.version ? c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C AMapUI \u6DF7\u7528") : f.length ? window.AMapUI.loadUI(f, function() {
            for (var a2 = 0, b2 = f.length; a2 < b2; a2++) {
              var c2 = f[a2].split("/").slice(-1)[0];
              window.AMapUI[c2] = arguments[a2];
            }
            h();
          }) : h() : a.version && a.version !== d.AMapUI.version ? c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C AMapUI \u6DF7\u7528") : n.AMapUI.push(function(a2) {
            a2 ? c(a2) : f.length ? window.AMapUI.loadUI(f, function() {
              for (var a3 = 0, b2 = f.length; a3 < b2; a3++) {
                var c2 = f[a3].split("/").slice(-1)[0];
                window.AMapUI[c2] = arguments[a3];
              }
              h();
            }) : h();
          });
        });
      }
      function r(a) {
        return new Promise(function(h, c) {
          if (g.Loca === b.failed) c("\u524D\u6B21\u8BF7\u6C42 Loca \u5931\u8D25");
          else if (g.Loca === b.notload) {
            g.Loca = b.loading;
            d.Loca.version = a.version || d.Loca.version;
            var f = d.Loca.version, e = d.AMap.version.startsWith("2"), l = f.startsWith("2");
            if (e && !l || !e && l) c("JSAPI \u4E0E Loca \u7248\u672C\u4E0D\u5BF9\u5E94\uFF01\uFF01");
            else {
              e = d.key;
              l = document.body || document.head;
              var k = document.createElement("script");
              k.type = "text/javascript";
              k.src = "https://webapi.amap.com/loca?v=" + f + "&key=" + e;
              k.onerror = function(a2) {
                g.Loca = b.failed;
                c("\u8BF7\u6C42 AMapUI \u5931\u8D25");
              };
              k.onload = function() {
                g.Loca = b.loaded;
                for (h(); n.Loca.length; ) n.Loca.splice(0, 1)[0]();
              };
              l.appendChild(k);
            }
          } else g.Loca === b.loaded ? a.version && a.version !== d.Loca.version ? c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C Loca \u6DF7\u7528") : h() : a.version && a.version !== d.Loca.version ? c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C Loca \u6DF7\u7528") : n.Loca.push(function(a2) {
            a2 ? c(a2) : c();
          });
        });
      }
      if (!window) throw Error("AMap JSAPI can only be used in Browser.");
      var b;
      (function(a) {
        a.notload = "notload";
        a.loading = "loading";
        a.loaded = "loaded";
        a.failed = "failed";
      })(b || (b = {}));
      var d = { key: "", AMap: { version: "1.4.15", plugins: [] }, AMapUI: { version: "1.1", plugins: [] }, Loca: { version: "1.3.2" } }, g = { AMap: b.notload, AMapUI: b.notload, Loca: b.notload }, n = { AMap: [], AMapUI: [], Loca: [] }, q = [], t = function(a) {
        "function" == typeof a && (g.AMap === b.loaded ? a(window.AMap) : q.push(a));
      };
      return { load: function(a) {
        return new Promise(function(h, c) {
          if (g.AMap == b.failed) c("");
          else if (g.AMap == b.notload) {
            var f = a.key, e = a.version, l = a.plugins;
            f ? (window.AMap && "lbs.amap.com" !== location.host && c("\u7981\u6B62\u591A\u79CDAPI\u52A0\u8F7D\u65B9\u5F0F\u6DF7\u7528"), d.key = f, d.AMap.version = e || d.AMap.version, d.AMap.plugins = l || d.AMap.plugins, g.AMap = b.loading, e = document.body || document.head, window.___onAPILoaded = function(d2) {
              delete window.___onAPILoaded;
              if (d2) g.AMap = b.failed, c(d2);
              else for (g.AMap = b.loaded, m(a).then(function() {
                h(window.AMap);
              })["catch"](c); q.length; ) q.splice(0, 1)[0]();
            }, l = document.createElement("script"), l.type = "text/javascript", l.src = "https://webapi.amap.com/maps?callback=___onAPILoaded&v=" + d.AMap.version + "&key=" + f + "&plugin=" + d.AMap.plugins.join(","), l.onerror = function(a2) {
              g.AMap = b.failed;
              c(a2);
            }, e.appendChild(l)) : c("\u8BF7\u586B\u5199key");
          } else if (g.AMap == b.loaded) if (a.key && a.key !== d.key) c("\u591A\u4E2A\u4E0D\u4E00\u81F4\u7684 key");
          else if (a.version && a.version !== d.AMap.version) c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C JSAPI \u6DF7\u7528");
          else {
            f = [];
            if (a.plugins) for (e = 0; e < a.plugins.length; e += 1) -1 == d.AMap.plugins.indexOf(a.plugins[e]) && f.push(a.plugins[e]);
            if (f.length) window.AMap.plugin(f, function() {
              m(a).then(function() {
                h(window.AMap);
              })["catch"](c);
            });
            else m(a).then(function() {
              h(window.AMap);
            })["catch"](c);
          }
          else if (a.key && a.key !== d.key) c("\u591A\u4E2A\u4E0D\u4E00\u81F4\u7684 key");
          else if (a.version && a.version !== d.AMap.version) c("\u4E0D\u5141\u8BB8\u591A\u4E2A\u7248\u672C JSAPI \u6DF7\u7528");
          else {
            var k = [];
            if (a.plugins) for (e = 0; e < a.plugins.length; e += 1) -1 == d.AMap.plugins.indexOf(a.plugins[e]) && k.push(a.plugins[e]);
            t(function() {
              if (k.length) window.AMap.plugin(k, function() {
                m(a).then(function() {
                  h(window.AMap);
                })["catch"](c);
              });
              else m(a).then(function() {
                h(window.AMap);
              })["catch"](c);
            });
          }
        });
      }, reset: function() {
        delete window.AMap;
        delete window.AMapUI;
        delete window.Loca;
        d = { key: "", AMap: { version: "1.4.15", plugins: [] }, AMapUI: { version: "1.1", plugins: [] }, Loca: { version: "1.3.2" } };
        g = {
          AMap: b.notload,
          AMapUI: b.notload,
          Loca: b.notload
        };
        n = { AMap: [], AMapUI: [], Loca: [] };
      } };
    });
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PersonalMapPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/view.ts
var import_amap_jsapi_loader = __toESM(require_dist(), 1);
var import_obsidian2 = require("obsidian");

// src/helpers.ts
var CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";
function isFiniteCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function hasCoordinates(value) {
  return isFiniteCoordinate(value.longitude) && isFiniteCoordinate(value.latitude) && value.longitude >= -180 && value.longitude <= 180 && value.latitude >= -85.051129 && value.latitude <= 85.051129;
}
function normalizeText(value) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}
function distanceMeters(left, right) {
  const radius = 63710088e-1;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const latitude1 = toRadians(left.latitude);
  const latitude2 = toRadians(right.latitude);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
function encodeTime(timestamp) {
  let value = Math.max(0, Math.floor(timestamp));
  let output = "";
  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}
function randomChars(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => CROCKFORD[value % 32]).join("");
}
function createPlaceId(now = Date.now()) {
  return `plc_${encodeTime(now)}${randomChars(16)}`;
}
function safeFileStem(value) {
  const cleaned = value.normalize("NFKC").replace(/[\\/:*?"<>|#\[\]^]/g, "-").replace(/\s+/g, " ").replace(/-+/g, "-").trim().replace(/^[.\s-]+|[.\s-]+$/g, "");
  return cleaned.slice(0, 80) || "\u672A\u547D\u540D\u5730\u70B9";
}
function extractExcerpt(markdown, limit = 160) {
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/```[\s\S]*?```/g, " ").replace(/^#{1,6}\s+.*$/gm, " ").replace(/!\[\[[^\]]+\]\]/g, " ").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, "$2 $1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_~=`>#-]/g, " ").replace(/\s+/g, " ").trim();
  return body.length > limit ? `${body.slice(0, limit).trimEnd()}\u2026` : body;
}
function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}
function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}
function appendUnique(values, value) {
  const normalized = value.trim();
  return [...new Set([...values.map((item) => item.trim()).filter(Boolean), normalized].filter(Boolean))];
}
function buildPlaceRelation(currentIds, currentRefs, placeId, placeRef) {
  const ids = normalizeStringList(currentIds);
  const refs = normalizeStringList(currentRefs);
  const placeIds = appendUnique(ids, placeId);
  const placeRefs = appendUnique(refs, placeRef);
  return {
    placeIds,
    placeRefs,
    changed: placeIds.length !== ids.length || placeRefs.length !== refs.length
  };
}
function parseMarkerIcon(value) {
  const normalized = value.trim();
  if (normalized.startsWith("emoji:") && normalized.slice(6).trim()) {
    return { kind: "emoji", value: normalized.slice(6).trim() };
  }
  if (normalized.startsWith("lucide:") && normalized.slice(7).trim()) {
    return { kind: "lucide", value: normalized.slice(7).trim() };
  }
  return { kind: "lucide", value: "map-pin" };
}
function boundsAround(longitude, latitude, meters) {
  const latitudeDelta = meters / 111320;
  const longitudeDelta = meters / (111320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));
  return {
    southWest: [longitude - longitudeDelta, latitude - latitudeDelta],
    northEast: [longitude + longitudeDelta, latitude + latitudeDelta]
  };
}
function zoomForRadius(latitude, radiusMeters, widthPixels, heightPixels) {
  const usablePixels = Math.max(220, Math.min(widthPixels, heightPixels) - 72);
  const metersPerPixel = Math.max(1, radiusMeters * 2 / usablePixels);
  const worldResolution = 156543.03392 * Math.max(0.2, Math.cos(latitude * Math.PI / 180));
  return Math.max(3, Math.min(20, Math.log2(worldResolution / metersPerPixel)));
}
function formatLocalDate(date = /* @__PURE__ */ new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatLocalDateTime(date = /* @__PURE__ */ new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${formatLocalDate(date)}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`;
}

// src/store.ts
var import_obsidian = require("obsidian");

// src/types.ts
var DEFAULT_PLACES_FOLDER = "50_\u5B9E\u4F53/\u5730\u70B9/\u5916\u90E8\u5730\u70B9";
var DEFAULT_CONFIG_PATH = "30_\u9879\u76EE/\u4E2A\u4EBA\u5730\u56FE/\u914D\u7F6E/\u5730\u56FE\u914D\u7F6E.md";

// src/store.ts
var DEFAULT_CONFIG = {
  placesFolder: DEFAULT_PLACES_FOLDER,
  centerPlace: "",
  initialRadiusMeters: 3e3,
  searchRadiusMeters: 5e3,
  panLimitMeters: 5e3,
  showHomeMarker: true
};
function frontmatterString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}
function frontmatterNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
function frontmatterBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
function positiveNumber(value, fallback) {
  const parsed = frontmatterNumber(value);
  return parsed !== null && parsed > 0 ? parsed : fallback;
}
function yamlString(value) {
  return JSON.stringify(value);
}
function serializeTags(tags) {
  const unique = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  return unique.length ? ["tags:", ...unique.map((tag) => `  - ${yamlString(tag)}`)] : ["tags: []"];
}
function serializePlaceNote(placeId, draft) {
  const today = formatLocalDate();
  const tags = ["\u4E2A\u4EBA\u5730\u56FE/\u5730\u70B9"];
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
    ...serializeTags(["\u5B9E\u4F53/\u5730\u70B9", ...tags]),
    "---",
    "",
    `# ${draft.title.trim()}`,
    "",
    "## \u4E2A\u4EBA\u7ECF\u9A8C",
    "",
    ""
  ].join("\n");
}
var PersonalMapStore = class {
  constructor(app) {
    this.app = app;
  }
  async ensureFolder(path) {
    const normalized = (0, import_obsidian.normalizePath)(path);
    if (this.app.vault.getAbstractFileByPath(normalized)) return;
    const segments = normalized.split("/");
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
    }
  }
  async loadConfig() {
    const file = this.app.vault.getAbstractFileByPath(DEFAULT_CONFIG_PATH);
    if (!(file instanceof import_obsidian.TFile)) return { ...DEFAULT_CONFIG };
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    return {
      placesFolder: frontmatterString(frontmatter.placesFolder, DEFAULT_CONFIG.placesFolder),
      centerPlace: frontmatterString(frontmatter.centerPlace, DEFAULT_CONFIG.centerPlace),
      initialRadiusMeters: positiveNumber(frontmatter.initialRadiusMeters, DEFAULT_CONFIG.initialRadiusMeters),
      searchRadiusMeters: positiveNumber(frontmatter.searchRadiusMeters, DEFAULT_CONFIG.searchRadiusMeters),
      panLimitMeters: positiveNumber(frontmatter.panLimitMeters, DEFAULT_CONFIG.panLimitMeters),
      showHomeMarker: frontmatterBoolean(frontmatter.showHomeMarker, DEFAULT_CONFIG.showHomeMarker)
    };
  }
  getBenefitLinkSource(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter?.couponSchedulerItem !== true || frontmatter?.entityType !== "benefit") return null;
    return {
      file,
      benefitId: frontmatterString(frontmatter.benefitId),
      title: frontmatterString(frontmatter.title, file.basename),
      merchantName: frontmatterString(frontmatter.merchantName),
      usablePlaceIds: normalizeStringList(frontmatter.usablePlaceIds),
      usableAt: normalizeStringList(frontmatter.usableAt)
    };
  }
  async linkBenefitToPlace(source, place) {
    let changed = false;
    const linkTarget = place.file.path.replace(/\.md$/i, "");
    const placeRef = `[[${linkTarget}|${place.title}]]`;
    await this.app.fileManager.processFrontMatter(source.file, (frontmatter) => {
      const relation = buildPlaceRelation(frontmatter.usablePlaceIds, frontmatter.usableAt, place.placeId, placeRef);
      changed = relation.changed;
      frontmatter.usablePlaceIds = relation.placeIds;
      frontmatter.usableAt = relation.placeRefs;
      if (changed) frontmatter.updated = formatLocalDateTime();
    });
    return changed;
  }
  loadActiveBenefitsForPlace(place) {
    const results = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (frontmatter?.couponSchedulerItem !== true || frontmatter?.entityType !== "benefit") continue;
      if (frontmatterString(frontmatter.benefitStatus) !== "active") continue;
      const ids = normalizeStringList(frontmatter.usablePlaceIds);
      const refs = normalizeStringList(frontmatter.usableAt);
      const linkedById = Boolean(place.placeId && ids.includes(place.placeId));
      const linkedByRef = refs.some((ref) => {
        const target = ref.match(/^\[\[([^|\]]+)/)?.[1]?.trim();
        if (!target) return false;
        return this.app.metadataCache.getFirstLinkpathDest(target, file.path)?.path === place.file.path;
      });
      if (!linkedById && !linkedByRef) continue;
      const price = frontmatterNumber(frontmatter.purchasePrice);
      results.push({
        file,
        benefitId: frontmatterString(frontmatter.benefitId),
        title: frontmatterString(frontmatter.title, file.basename),
        merchantName: frontmatterString(frontmatter.merchantName),
        validTo: frontmatterString(frontmatter.validTo),
        purchasePrice: price
      });
    }
    return results.sort((left, right) => left.validTo.localeCompare(right.validTo) || left.title.localeCompare(right.title, "zh-CN"));
  }
  async openFile(file) {
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  async loadPlaces(config) {
    const prefix = `${(0, import_obsidian.normalizePath)(config.placesFolder)}/`;
    const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
    const centerTarget = config.centerPlace.match(/^\[\[([^|\]]+)/)?.[1]?.trim();
    if (centerTarget) {
      const centerFile = this.app.metadataCache.getFirstLinkpathDest(centerTarget, DEFAULT_CONFIG_PATH);
      if (centerFile && !files.some((file) => file.path === centerFile.path)) files.push(centerFile);
    }
    const records = [];
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
          frontmatterString(frontmatter.placeType) === "residence" ? "\u4F4F\u5B85" : ""
        ),
        markerIcon: frontmatterString(frontmatter.markerIcon, "lucide:map-pin"),
        markerColor: frontmatterString(frontmatter.markerColor, "#2563eb"),
        home: frontmatterBoolean(frontmatter.home),
        privacy: frontmatterString(frontmatter.privacy, "private"),
        source: frontmatterString(frontmatter.source, "manual"),
        tags: normalizeTags(frontmatter.tags),
        excerpt: extractExcerpt(content),
        created: frontmatterString(frontmatter.created),
        updated: frontmatterString(frontmatter.updated)
      });
    }
    return records.sort((left, right) => Number(right.home) - Number(left.home) || left.title.localeCompare(right.title, "zh-CN"));
  }
  getRecentStyles(places, limit = 8) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    const sorted = [...places].sort((left, right) => right.updated.localeCompare(left.updated));
    for (const place of sorted) {
      const style = {
        placeType: place.placeType,
        markerIcon: place.markerIcon,
        markerColor: place.markerColor
      };
      const key = JSON.stringify(style);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(style);
      if (result.length >= limit) break;
    }
    return result;
  }
  findDuplicates(draft, places) {
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
        { longitude: place.longitude, latitude: place.latitude }
      ) <= 30;
    });
  }
  async createPlace(config, draft) {
    await this.ensureFolder(config.placesFolder);
    const placeId = createPlaceId();
    const suffix = placeId.slice(-6);
    const stem = safeFileStem(draft.title);
    let path = (0, import_obsidian.normalizePath)(`${config.placesFolder}/${stem}-${suffix}.md`);
    let index = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian.normalizePath)(`${config.placesFolder}/${stem}-${suffix}-${index}.md`);
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
        tags: ["\u4E2A\u4EBA\u5730\u56FE/\u5730\u70B9"],
        excerpt: "",
        created: formatLocalDate(),
        updated: formatLocalDate()
      };
    }
    return loaded;
  }
  async updatePlace(place, draft) {
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
      if (!tags.includes("\u5B9E\u4F53/\u5730\u70B9")) tags.unshift("\u5B9E\u4F53/\u5730\u70B9");
      if (!tags.includes("\u4E2A\u4EBA\u5730\u56FE/\u5730\u70B9")) tags.unshift("\u4E2A\u4EBA\u5730\u56FE/\u5730\u70B9");
      frontmatter.tags = tags;
    });
  }
  async deletePlace(place) {
    await this.app.vault.trash(place.file, true);
  }
  async openPlace(place) {
    await this.app.workspace.getLeaf(false).openFile(place.file);
  }
  findHome(places) {
    return places.find((place) => place.home) ?? null;
  }
  coordinatesReady(place) {
    return Boolean(place && isFiniteCoordinate(place.longitude) && isFiniteCoordinate(place.latitude));
  }
};

// src/view.ts
var VIEW_TYPE_PERSONAL_MAP = "personal-map-view";
var COMMON_ICONS = [
  "map-pin",
  "utensils",
  "coffee",
  "shopping-bag",
  "store",
  "hospital",
  "school",
  "trees",
  "train",
  "bus",
  "car",
  "dumbbell",
  "book-open",
  "camera",
  "house"
];
var FALLBACK_CENTER = [114.0579, 22.5431];
var AMAP_PLUGINS = ["AMap.PlaceSearch", "AMap.AutoComplete", "AMap.Geocoder", "AMap.Scale", "AMap.ToolBar"];
function locationNumbers(location2) {
  if (!location2) return null;
  const longitude = typeof location2.getLng === "function" ? location2.getLng() : Number(location2.lng ?? location2[0]);
  const latitude = typeof location2.getLat === "function" ? location2.getLat() : Number(location2.lat ?? location2[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
}
function placeToDraft(place) {
  if (!hasCoordinates(place)) return null;
  return {
    title: place.title,
    address: place.address,
    amapPoiId: place.amapPoiId,
    longitude: place.longitude,
    latitude: place.latitude,
    placeType: place.placeType,
    markerIcon: place.markerIcon,
    markerColor: place.markerColor,
    source: place.source,
    home: place.home
  };
}
var ConfirmationModal = class extends import_obsidian2.Modal {
  constructor(view, titleText, detailText, confirmText, onConfirm) {
    super(view.app);
    this.titleText = titleText;
    this.detailText = detailText;
    this.confirmText = confirmText;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.titleText });
    contentEl.createEl("p", { text: this.detailText });
    const buttons = contentEl.createDiv({ cls: "personal-map-modal-actions" });
    buttons.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
    const confirm = buttons.createEl("button", { text: this.confirmText, cls: "mod-warning" });
    confirm.addEventListener("click", () => {
      this.close();
      void this.onConfirm();
    });
  }
};
var PersonalMapView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  store = new PersonalMapStore(this.app);
  config = null;
  places = [];
  home = null;
  AMap = null;
  map = null;
  geocoder = null;
  placeSearch = null;
  autoComplete = null;
  markers = [];
  previewMarker = null;
  pickMode = null;
  relocatingPlace = null;
  debounceTimer = null;
  pendingBenefit = null;
  mapEl;
  resultEl;
  detailEl;
  statusEl;
  searchInput;
  textFilter;
  typeFilter;
  tagFilter;
  getViewType() {
    return VIEW_TYPE_PERSONAL_MAP;
  }
  getDisplayText() {
    return "\u4E2A\u4EBA\u5730\u56FE";
  }
  getIcon() {
    return "map-pinned";
  }
  async onOpen() {
    this.renderShell();
    await this.refreshData();
    await this.initializeMap();
  }
  async onClose() {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.clearMapObjects();
    if (this.map) this.map.destroy();
    this.map = null;
  }
  async startLinkingBenefit(file) {
    const source = this.store.getBenefitLinkSource(file);
    if (!source) {
      new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5F53\u524D\u7B14\u8BB0\u4E0D\u662F\u53EF\u5173\u8054\u7684\u5238\u98DF\u6743\u76CA");
      return;
    }
    this.pendingBenefit = source;
    if (!this.config) await this.refreshData();
    const query = source.merchantName || source.title;
    this.searchInput.value = query;
    this.renderLinkingPrompt();
    this.setStatus(`\u6B63\u5728\u4E3A\u201C${source.title}\u201D\u5173\u8054\u5730\u70B9`);
    if (this.placeSearch && query) await this.searchNearby(query);
  }
  renderShell() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("personal-map-view");
    const toolbar = container.createDiv({ cls: "personal-map-toolbar" });
    const searchWrap = toolbar.createDiv({ cls: "personal-map-search-wrap" });
    this.searchInput = searchWrap.createEl("input", {
      type: "search",
      placeholder: "\u641C\u7D22\u9644\u8FD1\u5E97\u540D\uFF0C\u56DE\u8F66\u6267\u884C\u641C\u7D22",
      attr: { "aria-label": "\u641C\u7D22\u9AD8\u5FB7\u5730\u70B9" }
    });
    const searchButton = searchWrap.createEl("button", { text: "\u641C\u7D22" });
    searchButton.addEventListener("click", () => void this.searchNearby(this.searchInput.value));
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") void this.searchNearby(this.searchInput.value);
    });
    this.searchInput.addEventListener("input", () => this.scheduleSuggestions());
    this.textFilter = toolbar.createEl("input", {
      type: "search",
      placeholder: "\u7B5B\u9009\u5730\u70B9\u548C\u7ECF\u9A8C",
      attr: { "aria-label": "\u7B5B\u9009\u5730\u70B9" }
    });
    this.textFilter.addEventListener("input", () => this.renderMarkers());
    this.typeFilter = toolbar.createEl("select", { attr: { "aria-label": "\u6309\u7C7B\u578B\u7B5B\u9009" } });
    this.typeFilter.addEventListener("change", () => this.renderMarkers());
    this.tagFilter = toolbar.createEl("select", { attr: { "aria-label": "\u6309\u6807\u7B7E\u7B5B\u9009" } });
    this.tagFilter.addEventListener("change", () => this.renderMarkers());
    const homeButton = toolbar.createEl("button", { text: "\u56DE\u5230\u5BB6" });
    homeButton.addEventListener("click", () => this.focusHome());
    const pickButton = toolbar.createEl("button", { text: "\u5730\u56FE\u9009\u70B9" });
    pickButton.addEventListener("click", () => {
      this.pickMode = "create";
      this.relocatingPlace = null;
      this.setStatus("\u8BF7\u5728\u5730\u56FE\u4E0A\u70B9\u51FB\u8981\u4FDD\u5B58\u7684\u4F4D\u7F6E");
      this.map?.setDefaultCursor?.("crosshair");
    });
    const refreshButton = toolbar.createEl("button", { text: "\u5237\u65B0" });
    refreshButton.addEventListener("click", () => void this.refreshData());
    this.statusEl = container.createDiv({ cls: "personal-map-status" });
    const workspace = container.createDiv({ cls: "personal-map-workspace" });
    this.resultEl = workspace.createDiv({ cls: "personal-map-results" });
    this.mapEl = workspace.createDiv({ cls: "personal-map-canvas" });
    this.detailEl = workspace.createDiv({ cls: "personal-map-details" });
  }
  async refreshData() {
    this.config = await this.store.loadConfig();
    this.places = await this.store.loadPlaces(this.config);
    this.home = this.store.findHome(this.places);
    this.populateFilters();
    this.renderOfflineList();
    if (this.map) {
      this.applyHomeViewport();
      this.renderMarkers();
    }
    this.setStatus(`${this.places.length} \u4E2A\u5730\u70B9 \xB7 \u6570\u636E\u6765\u81EA ${this.config.placesFolder}`);
  }
  async initializeMap() {
    const credentials = this.plugin.getCredentials();
    if (!credentials.key || !credentials.securityCode) {
      this.mapEl.empty();
      const empty = this.mapEl.createDiv({ cls: "personal-map-empty-state" });
      empty.createEl("h3", { text: "\u8BF7\u5148\u914D\u7F6E\u9AD8\u5FB7\u5BC6\u94A5" });
      empty.createEl("p", { text: "\u6253\u5F00 \u8BBE\u7F6E \u2192 \u7B2C\u4E09\u65B9\u63D2\u4EF6 \u2192 \u4E2A\u4EBA\u5730\u56FE\uFF0C\u586B\u5199\u9AD8\u5FB7 JS API Key \u4E0E\u5B89\u5168\u5BC6\u94A5\u3002\u5730\u70B9 Markdown \u4ECD\u53EF\u5728\u5DE6\u4FA7\u6253\u5F00\u3002" });
      return;
    }
    try {
      window._AMapSecurityConfig = { securityJsCode: credentials.securityCode };
      if (window.AMap?.Map) {
        this.AMap = window.AMap;
        await new Promise((resolve) => this.AMap.plugin(AMAP_PLUGINS, resolve));
      } else {
        this.AMap = await import_amap_jsapi_loader.default.load({
          key: credentials.key,
          version: "2.0",
          plugins: AMAP_PLUGINS
        });
      }
      const center = this.store.coordinatesReady(this.home) ? [this.home.longitude, this.home.latitude] : FALLBACK_CENTER;
      const initialZoom = this.initialZoom(center[1]);
      this.mapEl.empty();
      this.map = new this.AMap.Map(this.mapEl, {
        viewMode: "2D",
        zoom: initialZoom,
        center,
        mapStyle: "amap://styles/whitesmoke",
        resizeEnable: true
      });
      this.map.addControl(new this.AMap.Scale());
      this.map.addControl(new this.AMap.ToolBar({ position: { right: "12px", top: "12px" } }));
      this.geocoder = new this.AMap.Geocoder({ city: "\u6DF1\u5733" });
      this.placeSearch = new this.AMap.PlaceSearch({ pageSize: 20, pageIndex: 1, city: "\u6DF1\u5733", citylimit: true });
      this.autoComplete = new this.AMap.AutoComplete({ city: "\u6DF1\u5733", citylimit: true });
      this.map.on("click", (event) => void this.handleMapClick(event));
      this.applyHomeViewport();
      this.renderMarkers();
      if (!this.store.coordinatesReady(this.home)) this.renderLocateHomePrompt();
    } catch (error) {
      console.error("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u9AD8\u5FB7\u5730\u56FE\u52A0\u8F7D\u5931\u8D25", error);
      this.mapEl.empty();
      const empty = this.mapEl.createDiv({ cls: "personal-map-empty-state" });
      empty.createEl("h3", { text: "\u9AD8\u5FB7\u5730\u56FE\u52A0\u8F7D\u5931\u8D25" });
      empty.createEl("p", { text: "\u8BF7\u68C0\u67E5\u7F51\u7EDC\u3001JS API Key\u3001\u5B89\u5168\u5BC6\u94A5\u548C\u9AD8\u5FB7\u63A7\u5236\u53F0\u4E2D\u7684 Key \u7C7B\u578B\u3002\u5730\u70B9 Markdown \u4E0D\u53D7\u5F71\u54CD\u3002" });
      this.setStatus("\u5730\u56FE\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u9AD8\u5FB7\u914D\u7F6E");
    }
  }
  renderLocateHomePrompt() {
    if (!this.home) return;
    this.detailEl.empty();
    this.detailEl.createEl("h3", { text: "\u9996\u6B21\u5B9A\u4F4D\u5BB6\u5EAD\u4E2D\u5FC3" });
    this.detailEl.createEl("p", { text: "\u5BB6\u5EAD\u7B14\u8BB0\u5DF2\u6709\u5730\u5740\uFF0C\u4F46\u5C1A\u672A\u786E\u8BA4\u5750\u6807\u3002\u7CFB\u7EDF\u4F1A\u5148\u5728\u9AD8\u5FB7\u4E2D\u67E5\u627E\u5E76\u663E\u793A\u4E34\u65F6\u6807\u70B9\uFF0C\u786E\u8BA4\u6216\u8C03\u6574\u540E\u624D\u5199\u5165 Markdown\u3002" });
    const button = this.detailEl.createEl("button", { text: "\u67E5\u627E\u5BB6\u5EAD\u5730\u5740", cls: "mod-cta" });
    button.addEventListener("click", () => void this.locateHome());
    const manual = this.detailEl.createEl("button", { text: "\u5728\u5730\u56FE\u4E0A\u9009\u62E9\u5BB6\u5EAD\u4E2D\u5FC3" });
    manual.addEventListener("click", () => {
      this.pickMode = "relocate";
      this.relocatingPlace = this.home;
      this.setStatus("\u8BF7\u5728\u5730\u56FE\u4E0A\u70B9\u51FB\u5BB6\u5EAD\u4E2D\u5FC3\u4F4D\u7F6E");
      this.map?.setDefaultCursor?.("crosshair");
    });
  }
  async locateHome() {
    if (!this.home || !this.geocoder) return;
    this.setStatus("\u6B63\u5728\u67E5\u627E\u5BB6\u5EAD\u5730\u5740\u2026");
    this.geocoder.getLocation(this.home.address, (status, result) => {
      const geocode = result?.geocodes?.[0];
      const coordinates = locationNumbers(geocode?.location);
      if (status !== "complete" || !coordinates) {
        new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u672A\u80FD\u5B9A\u4F4D\u5BB6\u5EAD\u5730\u5740\uFF0C\u8BF7\u4F7F\u7528\u5730\u56FE\u9009\u70B9");
        this.setStatus("\u5BB6\u5EAD\u5730\u5740\u5B9A\u4F4D\u5931\u8D25\uFF0C\u53EF\u70B9\u51FB\u201C\u5730\u56FE\u9009\u70B9\u201D\u540E\u518D\u4FEE\u6539\u5BB6.md");
        return;
      }
      const candidate = {
        title: this.home?.title || "\u5BB6",
        address: this.home?.address || String(geocode.formattedAddress ?? ""),
        amapPoiId: "",
        ...coordinates,
        placeType: this.home?.placeType || "\u4F4F\u5B85",
        markerIcon: this.home?.markerIcon || "lucide:house",
        markerColor: this.home?.markerColor || "#2563eb",
        source: "amap-geocoder",
        home: true,
        distance: null
      };
      this.previewCandidate(candidate, this.home ?? void 0);
      this.setStatus("\u8BF7\u786E\u8BA4\u5BB6\u5EAD\u4E2D\u5FC3\uFF1B\u5982\u4F4D\u7F6E\u4E0D\u51C6\uFF0C\u53EF\u5148\u70B9\u51FB\u201C\u8C03\u6574\u4F4D\u7F6E\u201D\u518D\u4FDD\u5B58");
    });
  }
  scheduleSuggestions() {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    const keyword = this.searchInput.value.trim();
    if (!keyword || !this.autoComplete) return;
    this.debounceTimer = window.setTimeout(() => {
      this.autoComplete.search(keyword, (status, result) => {
        if (status !== "complete") return;
        const candidates = (result?.tips ?? []).slice(0, 10).map((tip) => {
          const coordinates = locationNumbers(tip.location);
          if (!coordinates) return null;
          return {
            title: String(tip.name ?? keyword),
            address: [tip.district, tip.address].filter(Boolean).join(" "),
            amapPoiId: String(tip.id ?? ""),
            ...coordinates,
            placeType: "",
            markerIcon: "lucide:map-pin",
            markerColor: "#2563eb",
            source: "amap-autocomplete",
            distance: null
          };
        }).filter(Boolean);
        this.renderSearchResults(candidates, "\u8F93\u5165\u5EFA\u8BAE");
      });
    }, 300);
  }
  async searchNearby(keyword) {
    const query = keyword.trim();
    if (!query) return;
    if (!this.placeSearch) {
      new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u9AD8\u5FB7\u670D\u52A1\u5C1A\u672A\u52A0\u8F7D");
      return;
    }
    this.setStatus(`\u6B63\u5728\u641C\u7D22\u201C${query}\u201D\u2026`);
    const callback = (status, result) => {
      if (status !== "complete") {
        this.renderSearchResults([], `\u6CA1\u6709\u627E\u5230\u201C${query}\u201D`);
        this.setStatus(`\u6CA1\u6709\u627E\u5230\u201C${query}\u201D\uFF0C\u53EF\u5C1D\u8BD5\u66F4\u5B8C\u6574\u7684\u5E97\u540D\u6216\u5730\u56FE\u9009\u70B9`);
        return;
      }
      const candidates = (result?.poiList?.pois ?? []).map((poi) => {
        const coordinates = locationNumbers(poi.location);
        if (!coordinates) return null;
        return {
          title: String(poi.name ?? query),
          address: Array.isArray(poi.address) ? poi.address.join(" ") : String(poi.address ?? ""),
          amapPoiId: String(poi.id ?? ""),
          ...coordinates,
          placeType: String(poi.type?.split?.(";")?.[0] ?? ""),
          markerIcon: "lucide:map-pin",
          markerColor: "#2563eb",
          source: "amap-search",
          distance: Number.isFinite(Number(poi.distance)) ? Number(poi.distance) : null
        };
      }).filter(Boolean);
      this.renderSearchResults(candidates, `\u201C${query}\u201D\u7684\u641C\u7D22\u7ED3\u679C`);
      this.setStatus(`\u627E\u5230 ${candidates.length} \u4E2A\u5730\u70B9`);
    };
    if (this.store.coordinatesReady(this.home) && this.config) {
      this.placeSearch.searchNearBy(
        query,
        [this.home.longitude, this.home.latitude],
        this.config.searchRadiusMeters,
        callback
      );
    } else {
      this.placeSearch.search(query, callback);
    }
  }
  renderSearchResults(candidates, heading) {
    this.resultEl.empty();
    this.resultEl.createEl("h3", { text: heading });
    if (!candidates.length) {
      this.resultEl.createEl("p", { text: "\u6682\u65E0\u7ED3\u679C\u3002" });
      return;
    }
    for (const candidate of candidates) {
      const row = this.resultEl.createEl("button", { cls: "personal-map-result" });
      row.createEl("strong", { text: candidate.title });
      row.createEl("span", { text: candidate.address || "\u5730\u5740\u672A\u63D0\u4F9B" });
      if (candidate.distance !== null) row.createEl("small", { text: `${Math.round(candidate.distance)} \u7C73` });
      row.addEventListener("click", () => this.previewCandidate(candidate));
    }
  }
  previewCandidate(candidate, existing) {
    if (this.map && this.AMap) {
      if (this.previewMarker) this.map.remove(this.previewMarker);
      this.previewMarker = new this.AMap.Marker({
        position: [candidate.longitude, candidate.latitude],
        anchor: "bottom-center",
        content: this.buildMarkerElement(candidate.markerIcon, candidate.markerColor, true),
        zIndex: 200
      });
      this.map.add(this.previewMarker);
      this.map.setCenter([candidate.longitude, candidate.latitude]);
    }
    this.renderPlaceEditor(candidate, existing);
  }
  renderPlaceEditor(draft, existing) {
    this.detailEl.empty();
    this.detailEl.createEl("h3", {
      text: this.pendingBenefit ? existing ? "\u786E\u8BA4\u5730\u70B9\u5E76\u5173\u8054\u5238" : "\u521B\u5EFA\u5730\u70B9\u5E76\u5173\u8054\u5238" : existing ? "\u7F16\u8F91\u5730\u70B9" : "\u4FDD\u5B58\u5730\u70B9"
    });
    if (this.pendingBenefit) {
      this.detailEl.createEl("p", {
        cls: "personal-map-link-context",
        text: `\u5F85\u5173\u8054\uFF1A${this.pendingBenefit.title}`
      });
    }
    const form = this.detailEl.createDiv({ cls: "personal-map-editor" });
    const titleInput = this.field(form, "\u540D\u79F0", draft.title);
    const addressInput = this.field(form, "\u5730\u5740", draft.address);
    const typeInput = this.field(form, "\u81EA\u7531\u7C7B\u578B", draft.placeType, "\u4F8B\u5982\uFF1A\u9910\u9986\u3001\u5546\u573A\u3001\u516C\u56ED");
    const iconInput = this.field(form, "\u56FE\u6807", draft.markerIcon, "lucide:utensils \u6216 emoji:\u{1F35C}");
    const colorWrap = form.createDiv({ cls: "personal-map-field" });
    colorWrap.createEl("label", { text: "\u989C\u8272" });
    const colorInput = colorWrap.createEl("input", { type: "color", value: draft.markerColor || "#2563eb" });
    const common = form.createDiv({ cls: "personal-map-icon-grid" });
    for (const icon of COMMON_ICONS) {
      const button = common.createEl("button", { attr: { type: "button", title: icon, "aria-label": icon } });
      try {
        (0, import_obsidian2.setIcon)(button, icon);
      } catch {
        button.setText("\u25CF");
      }
      button.addEventListener("click", () => {
        iconInput.value = `lucide:${icon}`;
      });
    }
    for (const emoji of ["\u{1F35C}", "\u2615", "\u{1F370}", "\u{1F6D2}", "\u{1F3E5}", "\u{1F3EB}", "\u{1F333}", "\u{1F4CD}"]) {
      const button = common.createEl("button", { text: emoji, attr: { type: "button", title: emoji } });
      button.addEventListener("click", () => {
        iconInput.value = `emoji:${emoji}`;
      });
    }
    const recentStyles = this.store.getRecentStyles(this.places);
    if (recentStyles.length) {
      form.createEl("label", { text: "\u6700\u8FD1\u4F7F\u7528" });
      const styles = form.createDiv({ cls: "personal-map-recent-styles" });
      for (const style of recentStyles) {
        const button = styles.createEl("button", { text: style.placeType || style.markerIcon, attr: { type: "button" } });
        button.style.borderColor = style.markerColor;
        button.addEventListener("click", () => {
          typeInput.value = style.placeType;
          iconInput.value = style.markerIcon;
          colorInput.value = style.markerColor;
        });
      }
    }
    const actions = form.createDiv({ cls: "personal-map-editor-actions" });
    const save = actions.createEl("button", {
      text: this.pendingBenefit ? existing ? "\u4FDD\u5B58\u5E76\u5173\u8054" : "\u521B\u5EFA\u5E76\u5173\u8054" : existing ? "\u4FDD\u5B58\u4FEE\u6539" : "\u521B\u5EFA\u5730\u70B9\u7B14\u8BB0",
      cls: "mod-cta"
    });
    save.addEventListener("click", () => void this.saveEditorDraft({
      ...draft,
      title: titleInput.value.trim(),
      address: addressInput.value.trim(),
      placeType: typeInput.value.trim(),
      markerIcon: iconInput.value.trim() || "lucide:map-pin",
      markerColor: colorInput.value
    }, existing));
    const relocate = actions.createEl("button", { text: "\u8C03\u6574\u4F4D\u7F6E" });
    relocate.addEventListener("click", () => {
      this.pickMode = "relocate";
      this.relocatingPlace = existing ?? null;
      this.setStatus("\u8BF7\u5728\u5730\u56FE\u4E0A\u70B9\u51FB\u65B0\u7684\u6807\u70B9\u4F4D\u7F6E");
      this.map?.setDefaultCursor?.("crosshair");
    });
    if (existing) {
      const open = actions.createEl("button", { text: "\u6253\u5F00\u7B14\u8BB0" });
      open.addEventListener("click", () => void this.store.openPlace(existing));
    }
    if (this.pendingBenefit) {
      const cancel = actions.createEl("button", { text: "\u53D6\u6D88\u5173\u8054" });
      cancel.addEventListener("click", () => this.cancelBenefitLink());
    }
  }
  field(container, label, value, placeholder = "") {
    const wrap = container.createDiv({ cls: "personal-map-field" });
    wrap.createEl("label", { text: label });
    return wrap.createEl("input", { type: "text", value, placeholder });
  }
  async saveEditorDraft(draft, existing) {
    if (!this.config) return;
    if (!draft.title || !Number.isFinite(draft.longitude) || !Number.isFinite(draft.latitude)) {
      new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u540D\u79F0\u548C\u5750\u6807\u4E0D\u80FD\u4E3A\u7A7A");
      return;
    }
    if (existing) {
      await this.store.updatePlace(existing, draft);
      if (this.pendingBenefit) await this.completeBenefitLink(existing);
      else new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5730\u70B9\u5DF2\u66F4\u65B0\uFF0C\u4E2A\u4EBA\u7ECF\u9A8C\u6B63\u6587\u672A\u6539\u52A8");
      await this.refreshData();
      this.clearPreview();
      return;
    }
    const duplicates = this.store.findDuplicates(draft, this.places);
    if (duplicates.length) {
      const duplicate = duplicates[0];
      new ConfirmationModal(
        this,
        "\u53D1\u73B0\u53EF\u80FD\u91CD\u590D\u7684\u5730\u70B9",
        `\u5DF2\u6709\u201C${duplicate.title}\u201D\u3002\u5EFA\u8BAE\u6253\u5F00\u73B0\u6709\u7B14\u8BB0\uFF0C\u907F\u514D\u91CD\u590D\u6807\u70B9\u3002`,
        "\u4ECD\u7136\u521B\u5EFA",
        async () => {
          await this.createDraft(draft);
        }
      ).open();
      const open = this.detailEl.createEl("button", { text: `\u6253\u5F00\u5DF2\u6709\u5730\u70B9\uFF1A${duplicate.title}` });
      open.addEventListener("click", () => void this.store.openPlace(duplicate));
      if (this.pendingBenefit) {
        const link = this.detailEl.createEl("button", { text: `\u5173\u8054\u5DF2\u6709\u5730\u70B9\uFF1A${duplicate.title}`, cls: "mod-cta" });
        link.addEventListener("click", () => void this.completeBenefitLink(duplicate));
      }
      return;
    }
    await this.createDraft(draft);
  }
  async createDraft(draft) {
    if (!this.config) return;
    const created = await this.store.createPlace(this.config, draft);
    if (this.pendingBenefit) await this.completeBenefitLink(created);
    else new import_obsidian2.Notice(`\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5DF2\u521B\u5EFA ${created.title}`);
    await this.refreshData();
    this.clearPreview();
    this.showDetails(this.places.find((place) => place.file.path === created.file.path) ?? created);
  }
  async handleMapClick(event) {
    if (!this.pickMode) return;
    const coordinates = locationNumbers(event.lnglat);
    if (!coordinates) return;
    this.map?.setDefaultCursor?.("default");
    const relocating = this.relocatingPlace;
    this.pickMode = null;
    this.relocatingPlace = null;
    this.reverseGeocode(coordinates.longitude, coordinates.latitude, (address) => {
      if (relocating) {
        const current = placeToDraft(relocating) ?? {
          title: relocating.title,
          address: relocating.address,
          amapPoiId: relocating.amapPoiId,
          longitude: coordinates.longitude,
          latitude: coordinates.latitude,
          placeType: relocating.placeType,
          markerIcon: relocating.markerIcon,
          markerColor: relocating.markerColor,
          source: "manual",
          home: relocating.home,
          distance: null
        };
        this.previewCandidate({ ...current, ...coordinates, address: address || current.address }, relocating);
      } else {
        this.previewCandidate({
          title: address ? address.split(/[省市区]/).filter(Boolean).at(-1) || "\u81EA\u5B9A\u4E49\u5730\u70B9" : "\u81EA\u5B9A\u4E49\u5730\u70B9",
          address,
          amapPoiId: "",
          ...coordinates,
          placeType: "",
          markerIcon: "lucide:map-pin",
          markerColor: "#2563eb",
          source: "manual",
          distance: null
        });
      }
    });
  }
  reverseGeocode(longitude, latitude, callback) {
    if (!this.geocoder) {
      callback("");
      return;
    }
    this.geocoder.getAddress([longitude, latitude], (status, result) => {
      callback(status === "complete" ? String(result?.regeocode?.formattedAddress ?? "") : "");
    });
  }
  renderMarkers() {
    if (!this.map || !this.AMap) return;
    if (this.markers.length) this.map.remove(this.markers);
    this.markers = [];
    const text = this.textFilter?.value.trim().toLocaleLowerCase() ?? "";
    const type = this.typeFilter?.value ?? "";
    const tag = this.tagFilter?.value ?? "";
    for (const place of this.places) {
      if (!hasCoordinates(place)) continue;
      if (place.home && this.config?.showHomeMarker === false) continue;
      const haystack = [place.title, place.address, place.placeType, place.excerpt, ...place.tags].join(" ").toLocaleLowerCase();
      if (text && !haystack.includes(text)) continue;
      if (type && place.placeType !== type) continue;
      if (tag && !place.tags.includes(tag)) continue;
      const marker = new this.AMap.Marker({
        position: [place.longitude, place.latitude],
        title: place.title,
        anchor: "bottom-center",
        content: this.buildMarkerElement(place.markerIcon, place.markerColor, false, place.home),
        zIndex: place.home ? 120 : 100
      });
      marker.on("click", () => this.showDetails(place));
      this.markers.push(marker);
    }
    if (this.markers.length) this.map.add(this.markers);
  }
  buildMarkerElement(iconSpec, color, preview = false, home = false) {
    const marker = document.createElement("div");
    marker.className = `personal-map-marker${preview ? " is-preview" : ""}${home ? " is-home" : ""}`;
    marker.style.setProperty("--personal-map-marker-color", color || "#2563eb");
    const icon = parseMarkerIcon(iconSpec);
    if (icon.kind === "emoji") {
      marker.textContent = icon.value;
      marker.classList.add("is-emoji");
    } else {
      try {
        (0, import_obsidian2.setIcon)(marker, icon.value);
        if (!marker.querySelector("svg")) (0, import_obsidian2.setIcon)(marker, "map-pin");
      } catch {
        (0, import_obsidian2.setIcon)(marker, "map-pin");
      }
    }
    return marker;
  }
  showDetails(place) {
    this.detailEl.empty();
    const heading = this.detailEl.createDiv({ cls: "personal-map-detail-heading" });
    heading.appendChild(this.buildMarkerElement(place.markerIcon, place.markerColor, false, place.home));
    const text = heading.createDiv();
    text.createEl("h3", { text: place.title });
    if (place.placeType) text.createEl("small", { text: place.placeType });
    if (place.address) this.detailEl.createEl("p", { text: place.address });
    if (this.pendingBenefit) {
      const linkBox = this.detailEl.createDiv({ cls: "personal-map-link-box" });
      linkBox.createEl("strong", { text: `\u5173\u8054\u201C${this.pendingBenefit.title}\u201D` });
      linkBox.createEl("p", { text: "\u786E\u8BA4\u8FD9\u662F\u8BE5\u5238\u53EF\u7528\u7684\u5B9E\u9645\u95E8\u5E97\u540E\u518D\u5173\u8054\u3002" });
      const link = linkBox.createEl("button", { text: "\u5173\u8054\u5230\u6B64\u5730\u70B9", cls: "mod-cta" });
      link.addEventListener("click", () => void this.completeBenefitLink(place));
      const cancel = linkBox.createEl("button", { text: "\u53D6\u6D88" });
      cancel.addEventListener("click", () => this.cancelBenefitLink());
    }
    this.detailEl.createEl("h4", { text: "\u4E2A\u4EBA\u7ECF\u9A8C" });
    this.detailEl.createEl("p", { text: place.excerpt || "\u5C1A\u672A\u8BB0\u5F55\uFF0C\u6253\u5F00\u7B14\u8BB0\u540E\u53EF\u4EE5\u81EA\u7531\u586B\u5199\u3002" });
    if (place.tags.length) this.detailEl.createEl("p", { cls: "personal-map-tags", text: place.tags.map((tag) => `#${tag}`).join("  ") });
    const actions = this.detailEl.createDiv({ cls: "personal-map-detail-actions" });
    const open = actions.createEl("button", { text: "\u6253\u5F00\u7B14\u8BB0", cls: "mod-cta" });
    open.addEventListener("click", () => void this.store.openPlace(place));
    const edit = actions.createEl("button", { text: "\u7F16\u8F91\u6807\u70B9" });
    edit.addEventListener("click", () => {
      const draft = placeToDraft(place);
      if (draft) this.previewCandidate(draft, place);
      else new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u8BE5\u5730\u70B9\u5C1A\u672A\u8BBE\u7F6E\u5750\u6807");
    });
    if (hasCoordinates(place)) {
      const amap = actions.createEl("button", { text: "\u5728\u9AD8\u5FB7\u6253\u5F00" });
      amap.addEventListener("click", () => {
        const uri = `https://uri.amap.com/marker?position=${place.longitude},${place.latitude}&name=${encodeURIComponent(place.title)}&src=personal-map&callnative=1`;
        window.open(uri, "_blank");
      });
    }
    if (!place.home) {
      const remove = actions.createEl("button", { text: "\u79FB\u5230\u56DE\u6536\u7AD9" });
      remove.addEventListener("click", () => {
        new ConfirmationModal(
          this,
          "\u79FB\u9664\u5730\u70B9",
          `\u5C06\u201C${place.title}\u201D\u79FB\u52A8\u5230\u7CFB\u7EDF\u56DE\u6536\u7AD9\uFF0C\u53EF\u5728\u56DE\u6536\u7AD9\u6062\u590D\u3002`,
          "\u79FB\u5230\u56DE\u6536\u7AD9",
          async () => {
            await this.store.deletePlace(place);
            new import_obsidian2.Notice(`\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5DF2\u5C06 ${place.title} \u79FB\u5230\u56DE\u6536\u7AD9`);
            await this.refreshData();
            this.detailEl.empty();
          }
        ).open();
      });
    }
    const benefits = this.detailEl.createDiv({ cls: "personal-map-linked-benefits" });
    void this.renderLinkedBenefits(place, benefits);
  }
  renderLinkingPrompt() {
    if (!this.pendingBenefit) return;
    this.detailEl.empty();
    this.detailEl.createEl("h3", { text: "\u5173\u8054\u5238\u5230\u5730\u70B9" });
    this.detailEl.createEl("p", { text: this.pendingBenefit.title });
    if (this.pendingBenefit.merchantName) {
      this.detailEl.createEl("p", { text: `\u5546\u6237\uFF1A${this.pendingBenefit.merchantName}` });
    }
    this.detailEl.createEl("p", { text: "\u4ECE\u9AD8\u5FB7\u641C\u7D22\u7ED3\u679C\u6216\u5DF2\u6709\u5730\u70B9\u4E2D\u9009\u62E9\u5B9E\u9645\u95E8\u5E97\uFF1B\u4E0D\u4F1A\u6309\u5546\u6237\u6587\u5B57\u81EA\u52A8\u5EFA\u70B9\u3002" });
    const cancel = this.detailEl.createEl("button", { text: "\u53D6\u6D88\u5173\u8054" });
    cancel.addEventListener("click", () => this.cancelBenefitLink());
  }
  cancelBenefitLink() {
    this.pendingBenefit = null;
    this.clearPreview();
    this.renderOfflineList();
    this.detailEl.empty();
    this.setStatus(`${this.places.length} \u4E2A\u5730\u70B9 \xB7 \u5DF2\u53D6\u6D88\u5173\u8054`);
  }
  async completeBenefitLink(place) {
    const source = this.pendingBenefit;
    if (!source) return;
    this.pendingBenefit = null;
    try {
      const changed = await this.store.linkBenefitToPlace(source, place);
      new import_obsidian2.Notice(changed ? `\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5DF2\u5C06\u201C${source.title}\u201D\u5173\u8054\u5230 ${place.title}` : `\u4E2A\u4EBA\u5730\u56FE\uFF1A\u8FD9\u5F20\u5238\u5DF2\u7ECF\u5173\u8054\u5230 ${place.title}`);
      await this.refreshData();
      this.clearPreview();
      const current = this.places.find((candidate) => candidate.placeId === place.placeId) ?? place;
      this.showDetails(current);
      this.setStatus(`\u5DF2\u5173\u8054\uFF1A${source.title} \u2192 ${place.title}`);
    } catch (error) {
      this.pendingBenefit = source;
      console.error("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5173\u8054\u5238\u5230\u5730\u70B9\u5931\u8D25", error);
      new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u5173\u8054\u5931\u8D25\uFF0C\u5238\u7B14\u8BB0\u672A\u88AB\u6539\u5199");
      this.renderLinkingPrompt();
    }
  }
  async renderLinkedBenefits(place, container) {
    const benefits = this.store.loadActiveBenefitsForPlace(place);
    if (!container.isConnected) return;
    container.empty();
    container.createEl("h4", { text: `\u53EF\u7528\u5238\uFF08${benefits.length}\uFF09` });
    if (!benefits.length) {
      container.createEl("p", { text: "\u6682\u65E0\u5173\u8054\u7684\u6709\u6548\u5238\u3002" });
      return;
    }
    for (const benefit of benefits) {
      const row = container.createEl("button", { cls: "personal-map-benefit-row" });
      row.createEl("strong", { text: benefit.title });
      const details = [
        benefit.validTo ? `\u6709\u6548\u671F\u81F3 ${benefit.validTo}` : "\u672A\u586B\u5199\u5230\u671F\u65E5",
        benefit.purchasePrice !== null ? `\xA5${benefit.purchasePrice.toFixed(2)}` : ""
      ].filter(Boolean).join(" \xB7 ");
      row.createEl("span", { text: details });
      row.addEventListener("click", () => void this.store.openFile(benefit.file));
    }
  }
  populateFilters() {
    if (!this.typeFilter || !this.tagFilter) return;
    const selectedType = this.typeFilter.value;
    const selectedTag = this.tagFilter.value;
    const types = [...new Set(this.places.map((place) => place.placeType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const tags = [...new Set(this.places.flatMap((place) => place.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    this.typeFilter.empty();
    this.typeFilter.createEl("option", { text: "\u5168\u90E8\u7C7B\u578B", value: "" });
    for (const type of types) this.typeFilter.createEl("option", { text: type, value: type });
    this.typeFilter.value = types.includes(selectedType) ? selectedType : "";
    this.tagFilter.empty();
    this.tagFilter.createEl("option", { text: "\u5168\u90E8\u6807\u7B7E", value: "" });
    for (const tag of tags) this.tagFilter.createEl("option", { text: `#${tag}`, value: tag });
    this.tagFilter.value = tags.includes(selectedTag) ? selectedTag : "";
  }
  renderOfflineList() {
    this.resultEl.empty();
    this.resultEl.createEl("h3", { text: "\u5DF2\u4FDD\u5B58\u5730\u70B9" });
    if (!this.places.length) {
      this.resultEl.createEl("p", { text: "\u8FD8\u6CA1\u6709\u5730\u70B9\u7B14\u8BB0\u3002" });
      return;
    }
    for (const place of this.places) {
      const row = this.resultEl.createEl("button", { cls: "personal-map-result" });
      row.createEl("strong", { text: place.title });
      row.createEl("span", { text: place.address || "\u5C1A\u672A\u586B\u5199\u5730\u5740" });
      if (!hasCoordinates(place)) row.createEl("small", { text: "\u7B49\u5F85\u5B9A\u4F4D" });
      row.addEventListener("click", () => this.showDetails(place));
    }
  }
  applyHomeViewport() {
    if (!this.map || !this.AMap || !this.config || !this.store.coordinatesReady(this.home)) return;
    this.map.setZoomAndCenter(this.initialZoom(this.home.latitude), [this.home.longitude, this.home.latitude], true);
    const area = boundsAround(this.home.longitude, this.home.latitude, this.config.panLimitMeters);
    this.map.setLimitBounds(new this.AMap.Bounds(area.southWest, area.northEast));
  }
  focusHome() {
    if (!this.store.coordinatesReady(this.home)) {
      new import_obsidian2.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u8BF7\u5148\u5B9A\u4F4D\u5BB6\u5EAD\u4E2D\u5FC3");
      this.renderLocateHomePrompt();
      return;
    }
    this.map?.setZoomAndCenter?.(this.initialZoom(this.home.latitude), [this.home.longitude, this.home.latitude]);
    this.showDetails(this.home);
  }
  initialZoom(latitude) {
    const radius = this.config?.initialRadiusMeters ?? 3e3;
    return zoomForRadius(latitude, radius, this.mapEl.clientWidth, this.mapEl.clientHeight);
  }
  clearPreview() {
    if (this.previewMarker && this.map) this.map.remove(this.previewMarker);
    this.previewMarker = null;
  }
  clearMapObjects() {
    this.clearPreview();
    if (this.map && this.markers.length) this.map.remove(this.markers);
    this.markers = [];
  }
  setStatus(text) {
    if (this.statusEl) this.statusEl.setText(text);
  }
};

// src/main.ts
var PersonalMapPlugin = class extends import_obsidian3.Plugin {
  async onload() {
    const store = new PersonalMapStore(this.app);
    this.registerView(VIEW_TYPE_PERSONAL_MAP, (leaf) => new PersonalMapView(leaf, this));
    this.addRibbonIcon("map-pinned", "\u6253\u5F00\u4E2A\u4EBA\u5730\u56FE", () => void this.activateView());
    this.addCommand({
      id: "open-personal-map",
      name: "\u6253\u5F00\u4E2A\u4EBA\u5730\u56FE",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "link-current-benefit-to-place",
      name: "\u5C06\u5F53\u524D\u5238\u5173\u8054\u5230\u5730\u56FE\u5730\u70B9",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !store.getBenefitLinkSource(file)) return false;
        if (!checking) void this.activateView(file);
        return true;
      }
    });
    this.addSettingTab(new PersonalMapSettingTab(this.app, this));
    const refresh = () => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PERSONAL_MAP)) {
        const view = leaf.view;
        if (view instanceof PersonalMapView) void view.refreshData();
      }
    };
    this.registerEvent(this.app.vault.on("create", refresh));
    this.registerEvent(this.app.vault.on("modify", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_PERSONAL_MAP);
  }
  secretKey(name) {
    return `personal-map:${this.app.vault.getName()}:${name}`;
  }
  getCredentials() {
    return {
      key: window.localStorage.getItem(this.secretKey("key")) ?? "",
      securityCode: window.localStorage.getItem(this.secretKey("securityCode")) ?? ""
    };
  }
  setCredentials(credentials) {
    window.localStorage.setItem(this.secretKey("key"), credentials.key.trim());
    window.localStorage.setItem(this.secretKey("securityCode"), credentials.securityCode.trim());
  }
  async activateView(benefitFile) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PERSONAL_MAP)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE_PERSONAL_MAP, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    if (benefitFile && leaf.view instanceof PersonalMapView) {
      await leaf.view.startLinkingBenefit(benefitFile);
    }
  }
};
var PersonalMapSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u4E2A\u4EBA\u5730\u56FE\u8BBE\u7F6E" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "\u9AD8\u5FB7\u5BC6\u94A5\u4EC5\u4FDD\u5B58\u5728\u8FD9\u53F0\u8BBE\u5907\u7684\u672C\u5730\u5B58\u50A8\u4E2D\uFF0C\u4E0D\u5199\u5165 Markdown \u6216\u63D2\u4EF6\u6E90\u7801\u3002\u6BCF\u53F0\u8BBE\u5907\u9700\u8981\u5206\u522B\u586B\u5199\u3002"
    });
    const current = this.plugin.getCredentials();
    let key = current.key;
    let securityCode = current.securityCode;
    new import_obsidian3.Setting(containerEl).setName("\u9AD8\u5FB7 JS API Key").setDesc("\u5728\u9AD8\u5FB7\u5F00\u653E\u5E73\u53F0\u7533\u8BF7 Web \u7AEF\uFF08JS API\uFF09Key\u3002").addText((text) => text.setPlaceholder("\u8BF7\u8F93\u5165 Key").setValue(key).onChange((value) => {
      key = value;
    }));
    new import_obsidian3.Setting(containerEl).setName("\u9AD8\u5FB7\u5B89\u5168\u5BC6\u94A5").setDesc("2021-12-02 \u4E4B\u540E\u7533\u8BF7\u7684 Key \u5FC5\u987B\u914D\u5408 securityJsCode \u4F7F\u7528\u3002").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("\u8BF7\u8F93\u5165\u5B89\u5168\u5BC6\u94A5").setValue(securityCode).onChange((value) => {
        securityCode = value;
      });
    });
    new import_obsidian3.Setting(containerEl).setName("\u4FDD\u5B58\u5230\u672C\u673A").setDesc("\u4FDD\u5B58\u540E\u91CD\u65B0\u6253\u5F00\u4E2A\u4EBA\u5730\u56FE\u5373\u53EF\u52A0\u8F7D\u9AD8\u5FB7\u670D\u52A1\u3002").addButton((button) => button.setButtonText("\u4FDD\u5B58\u5BC6\u94A5").setCta().onClick(() => {
      this.plugin.setCredentials({ key, securityCode });
      new import_obsidian3.Notice("\u4E2A\u4EBA\u5730\u56FE\uFF1A\u9AD8\u5FB7\u5BC6\u94A5\u5DF2\u4FDD\u5B58\u5728\u672C\u673A");
    }));
  }
};
