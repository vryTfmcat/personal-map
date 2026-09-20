import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsAround,
  appendUnique,
  buildPlaceRelation,
  createPlaceId,
  distanceMeters,
  extractExcerpt,
  formatLocalDateTime,
  normalizeStringList,
  normalizeText,
  parseMarkerIcon,
  safeFileStem,
  zoomForRadius,
} from "./helpers.ts";

test("place IDs follow the vault place ID contract", () => {
  assert.match(createPlaceId(0), /^plc_[0-9a-hjkmnp-tv-z]{26}$/);
});

test("file names remove vault-unsafe characters", () => {
  assert.equal(safeFileStem(' A/B:*?"<>|#[x] '), "A-B-x");
});

test("excerpt keeps prose and removes frontmatter and headings", () => {
  const source = "---\ntitle: A\n---\n# 标题\n\n## 个人经验\n\n很好吃，适合中午。";
  assert.equal(extractExcerpt(source), "很好吃，适合中午。");
});

test("marker icon parser supports lucide and emoji with fallback", () => {
  assert.deepEqual(parseMarkerIcon("lucide:utensils"), { kind: "lucide", value: "utensils" });
  assert.deepEqual(parseMarkerIcon("emoji:🍜"), { kind: "emoji", value: "🍜" });
  assert.deepEqual(parseMarkerIcon("bad"), { kind: "lucide", value: "map-pin" });
});

test("duplicate helpers normalize names and calculate nearby distance", () => {
  assert.equal(normalizeText(" 肯德基（红山店） "), "肯德基红山店");
  assert.ok(distanceMeters(
    { longitude: 114.0, latitude: 22.6 },
    { longitude: 114.0001, latitude: 22.6001 },
  ) < 30);
});

test("bounds contain their center", () => {
  const bounds = boundsAround(114, 22.6, 5000);
  assert.ok(bounds.southWest[0] < 114 && bounds.northEast[0] > 114);
  assert.ok(bounds.southWest[1] < 22.6 && bounds.northEast[1] > 22.6);
});

test("initial zoom preserves a wider radius on a narrow mobile view", () => {
  const desktopZoom = zoomForRadius(22.6, 3000, 1100, 760);
  const mobileZoom = zoomForRadius(22.6, 3000, 390, 650);
  assert.ok(desktopZoom > mobileZoom);
  assert.ok(mobileZoom > 12 && mobileZoom < 15);
});

test("link list helpers normalize scalar values and avoid duplicates", () => {
  assert.deepEqual(normalizeStringList(" plc_one "), ["plc_one"]);
  assert.deepEqual(appendUnique(["plc_one", "plc_one"], "plc_two"), ["plc_one", "plc_two"]);
});

test("place relation updates keep stable IDs and wikilinks in parallel", () => {
  const relation = buildPlaceRelation(["plc_one"], ["[[一号店]]"], "plc_two", "[[二号店]]");
  assert.deepEqual(relation.placeIds, ["plc_one", "plc_two"]);
  assert.deepEqual(relation.placeRefs, ["[[一号店]]", "[[二号店]]"]);
  assert.equal(relation.changed, true);
});

test("local timestamps include an explicit timezone offset", () => {
  assert.match(formatLocalDateTime(new Date(2026, 8, 20, 13, 0, 1)), /^2026-09-20T13:00:01[+-]\d{2}:\d{2}$/);
});
