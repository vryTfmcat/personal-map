import test from "node:test";
import assert from "node:assert/strict";
import {
  boundsAround,
  createPlaceId,
  distanceMeters,
  extractExcerpt,
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
