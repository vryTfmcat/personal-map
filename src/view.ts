import AMapLoader from "@amap/amap-jsapi-loader";
import {
  App,
  FuzzySuggestModal,
  ItemView,
  Modal,
  Notice,
  setIcon,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";
import { boundsAround, hasCoordinates, normalizeText, parseMarkerIcon, zoomForRadius } from "./helpers";
import { PersonalMapStore } from "./store";
import type {
  BenefitLinkSource,
  MapConfig,
  PersonalMapPluginApi,
  PlaceDraft,
  PlaceRecord,
  SearchCandidate,
} from "./types";

export const VIEW_TYPE_PERSONAL_MAP = "personal-map-view";

const COMMON_ICONS = [
  "map-pin", "utensils", "coffee", "shopping-bag", "store", "hospital", "school",
  "trees", "train", "bus", "car", "dumbbell", "book-open", "camera", "house",
];

const FALLBACK_CENTER: [number, number] = [114.0579, 22.5431];
const AMAP_PLUGINS = ["AMap.PlaceSearch", "AMap.AutoComplete", "AMap.Geocoder", "AMap.Scale", "AMap.ToolBar"];

function locationNumbers(location: any): { longitude: number; latitude: number } | null {
  if (!location) return null;
  const longitude = typeof location.getLng === "function" ? location.getLng() : Number(location.lng ?? location[0]);
  const latitude = typeof location.getLat === "function" ? location.getLat() : Number(location.lat ?? location[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
}

function placeToDraft(place: PlaceRecord): PlaceDraft | null {
  if (!hasCoordinates(place)) return null;
  return {
    title: place.title,
    address: place.address,
    amapPoiId: place.amapPoiId,
    longitude: place.longitude as number,
    latitude: place.latitude as number,
    placeType: place.placeType,
    markerIcon: place.markerIcon,
    markerColor: place.markerColor,
    source: place.source,
    home: place.home,
  };
}

class ConfirmationModal extends Modal {
  constructor(
    view: PersonalMapView,
    private readonly titleText: string,
    private readonly detailText: string,
    private readonly confirmText: string,
    private readonly onConfirm: () => void | Promise<void>,
  ) {
    super(view.app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.titleText });
    contentEl.createEl("p", { text: this.detailText });
    const buttons = contentEl.createDiv({ cls: "personal-map-modal-actions" });
    buttons.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
    const confirm = buttons.createEl("button", { text: this.confirmText, cls: "mod-warning" });
    confirm.addEventListener("click", () => {
      this.close();
      void this.onConfirm();
    });
  }
}

class BenefitSourceModal extends FuzzySuggestModal<TFile | TFolder> {
  constructor(
    app: App,
    private readonly isBenefitFile: (file: TFile) => boolean,
    private readonly onChoose: (item: TFile | TFolder) => void,
  ) {
    super(app);
    this.setPlaceholder("选择券 Markdown 或包含券的文件夹");
  }

  getItems(): Array<TFile | TFolder> {
    const files = this.app.vault.getMarkdownFiles().filter(this.isBenefitFile);
    const folders = this.app.vault.getAllLoadedFiles().filter((item): item is TFolder =>
      item instanceof TFolder && item.path.length > 0 && item.path !== "/" &&
      files.some((file) => file.path.startsWith(`${item.path}/`)),
    );
    return [...folders, ...files];
  }

  getItemText(item: TFile | TFolder): string {
    return `${item instanceof TFolder ? "券文件夹" : "券 Markdown"} · ${item.path}`;
  }

  onChooseItem(item: TFile | TFolder): void {
    this.onChoose(item);
  }
}

export class PersonalMapView extends ItemView {
  private readonly store = new PersonalMapStore(this.app);
  private config: MapConfig | null = null;
  private places: PlaceRecord[] = [];
  private home: PlaceRecord | null = null;
  private AMap: any = null;
  private map: any = null;
  private geocoder: any = null;
  private placeSearch: any = null;
  private autoComplete: any = null;
  private markers: any[] = [];
  private previewMarker: any = null;
  private pickMode: "create" | "relocate" | null = null;
  private relocatingPlace: PlaceRecord | null = null;
  private debounceTimer: number | null = null;
  private searchSequence = 0;
  private pendingBenefit: BenefitLinkSource | null = null;
  private pendingBenefitQueue: BenefitLinkSource[] = [];
  private benefitQueueTotal = 0;
  private benefitQueueCompleted = 0;
  private selectedPlaceId: string | null = null;

  private mapEl!: HTMLDivElement;
  private resultEl!: HTMLDivElement;
  private detailEl!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private sourceEl!: HTMLDivElement;
  private searchInput!: HTMLInputElement;
  private textFilter!: HTMLInputElement;
  private typeFilter!: HTMLSelectElement;
  private tagFilter!: HTMLSelectElement;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: PersonalMapPluginApi) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PERSONAL_MAP;
  }

  getDisplayText(): string {
    return "个人地图";
  }

  getIcon(): string {
    return "map-pinned";
  }

  async onOpen(): Promise<void> {
    this.renderShell();
    await this.refreshData();
    await this.initializeMap();
  }

  async onClose(): Promise<void> {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.clearMapObjects();
    if (this.map) this.map.destroy();
    this.map = null;
  }

  async startLinkingBenefit(file: TFile): Promise<void> {
    const source = this.store.getBenefitLinkSource(file);
    if (!source) {
      new Notice("个人地图：当前笔记不是可关联的券食权益");
      return;
    }
    await this.startBenefitImport([source]);
  }

  private async startBenefitImport(sources: BenefitLinkSource[]): Promise<void> {
    const unique = [...new Map(sources.map((source) => [source.file.path, source])).values()];
    if (!unique.length) {
      new Notice("个人地图：所选内容中没有券食权益 Markdown");
      return;
    }
    this.pendingBenefitQueue = unique.slice(1);
    this.benefitQueueTotal = unique.length;
    this.benefitQueueCompleted = 0;
    await this.prepareBenefitLink(unique[0]);
  }

  private async prepareBenefitLink(source: BenefitLinkSource): Promise<void> {
    this.pendingBenefit = source;
    if (!this.config) await this.refreshData();
    const query = source.merchantName || source.title;
    this.searchInput.value = query;
    this.renderLinkingPrompt();
    this.setStatus(`正在处理券 ${this.benefitQueueCompleted + 1}/${this.benefitQueueTotal}：${source.title}`);
    const linkedPlaces = this.places.filter((place) => source.usablePlaceIds.includes(place.placeId));
    if (linkedPlaces.length === 1) {
      this.setStatus(`这张券已关联，正在打开：${linkedPlaces[0].title}`);
      await this.completeBenefitLink(linkedPlaces[0]);
      return;
    }
    const normalizedMerchant = normalizeText(source.merchantName);
    const exactMatches = normalizedMerchant
      ? this.places.filter((place) => normalizeText(place.title) === normalizedMerchant)
      : [];
    if (exactMatches.length === 1) {
      this.setStatus(`找到唯一同名地点，正在自动关联：${source.title} → ${exactMatches[0].title}`);
      await this.completeBenefitLink(exactMatches[0]);
      return;
    }
    if (this.placeSearch && query) await this.searchNearby(query);
  }

  private renderShell(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("personal-map-view");

    const toolbar = container.createDiv({ cls: "personal-map-toolbar" });
    const searchWrap = toolbar.createDiv({ cls: "personal-map-search-wrap" });
    this.searchInput = searchWrap.createEl("input", {
      type: "search",
      placeholder: "搜索附近店名，回车执行搜索",
      attr: { "aria-label": "搜索高德地点" },
    });
    const searchButton = searchWrap.createEl("button", { text: "搜索" });
    searchButton.addEventListener("click", () => void this.searchNearby(this.searchInput.value));
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") void this.searchNearby(this.searchInput.value);
    });
    this.searchInput.addEventListener("input", () => this.scheduleSuggestions());

    this.textFilter = toolbar.createEl("input", {
      type: "search",
      placeholder: "筛选地点和经验",
      attr: { "aria-label": "筛选地点" },
    });
    this.textFilter.addEventListener("input", () => this.renderMarkers());
    this.typeFilter = toolbar.createEl("select", { attr: { "aria-label": "按类型筛选" } });
    this.typeFilter.addEventListener("change", () => this.renderMarkers());
    this.tagFilter = toolbar.createEl("select", { attr: { "aria-label": "按标签筛选" } });
    this.tagFilter.addEventListener("change", () => this.renderMarkers());

    const homeButton = toolbar.createEl("button", { text: "回到家" });
    homeButton.addEventListener("click", () => this.focusHome());
    const pickButton = toolbar.createEl("button", { text: "地图选点" });
    pickButton.addEventListener("click", () => {
      this.pickMode = "create";
      this.relocatingPlace = null;
      this.setStatus("请在地图上点击要保存的位置");
      this.map?.setDefaultCursor?.("crosshair");
    });
    const refreshButton = toolbar.createEl("button", { text: "刷新" });
    refreshButton.addEventListener("click", () => void this.refreshData());
    const importBenefitButton = toolbar.createEl("button", { text: "从券添加地点" });
    importBenefitButton.addEventListener("click", () => this.openBenefitSourcePicker());

    this.statusEl = container.createDiv({ cls: "personal-map-status" });
    this.sourceEl = container.createDiv({ cls: "personal-map-sources" });
    const workspace = container.createDiv({ cls: "personal-map-workspace" });
    this.resultEl = workspace.createDiv({ cls: "personal-map-results" });
    this.mapEl = workspace.createDiv({ cls: "personal-map-canvas" });
    this.detailEl = workspace.createDiv({ cls: "personal-map-details" });
  }

  async refreshData(): Promise<void> {
    this.config = await this.store.loadConfig();
    await this.refreshPlacesFromCurrentConfig();
  }

  private async refreshPlacesFromCurrentConfig(): Promise<void> {
    if (!this.config) return;
    this.places = await this.store.loadPlaces(this.config);
    this.home = this.store.findHome(this.places);
    this.populateFilters();
    this.renderPlaceSource();
    this.renderOfflineList();
    if (this.map) {
      this.applyHomeViewport();
      this.renderMarkers();
    }
    if (this.selectedPlaceId) {
      const selected = this.places.find((place) => place.placeId === this.selectedPlaceId);
      if (selected) this.showDetails(selected);
    }
    this.setStatus(`${this.places.length} 个地点 · 数据来自 ${this.config.placesFolder}`);
  }

  private openBenefitSourcePicker(): void {
    new BenefitSourceModal(
      this.app,
      (file) => this.store.getBenefitLinkSource(file) !== null,
      (item) => void this.importBenefitSource(item),
    ).open();
  }

  private async importBenefitSource(item: TFile | TFolder): Promise<void> {
    const files = item instanceof TFile
      ? [item]
      : this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${item.path}/`));
    const sources = files
      .map((file) => this.store.getBenefitLinkSource(file))
      .filter((source): source is BenefitLinkSource => source !== null);
    if (item instanceof TFolder) new Notice(`个人地图：已建立 ${sources.length} 张券的地点关联队列`);
    await this.startBenefitImport(sources);
  }

  private renderPlaceSource(): void {
    if (!this.sourceEl || !this.config) return;
    this.sourceEl.empty();
    this.sourceEl.createEl("span", { text: "地点主档" });
    this.sourceEl.createEl("span", { cls: "personal-map-source-chip is-primary", text: this.config.placesFolder });
  }

  private async initializeMap(): Promise<void> {
    const credentials = this.plugin.getCredentials();
    if (!credentials.key || !credentials.securityCode) {
      this.mapEl.empty();
      const empty = this.mapEl.createDiv({ cls: "personal-map-empty-state" });
      empty.createEl("h3", { text: "请先配置高德密钥" });
      empty.createEl("p", { text: "打开 设置 → 第三方插件 → 个人地图，填写高德 JS API Key 与安全密钥。地点 Markdown 仍可在左侧打开。" });
      return;
    }

    try {
      window._AMapSecurityConfig = { securityJsCode: credentials.securityCode };
      if (window.AMap?.Map) {
        this.AMap = window.AMap;
        await new Promise<void>((resolve) => this.AMap.plugin(AMAP_PLUGINS, resolve));
      } else {
        this.AMap = await AMapLoader.load({ key: credentials.key, version: "2.0", plugins: AMAP_PLUGINS });
      }
      const center = this.store.coordinatesReady(this.home)
        ? [this.home.longitude, this.home.latitude]
        : FALLBACK_CENTER;
      const initialZoom = this.initialZoom(center[1]);
      this.mapEl.empty();
      this.map = new this.AMap.Map(this.mapEl, {
        viewMode: "2D",
        zoom: initialZoom,
        center,
        mapStyle: "amap://styles/whitesmoke",
        resizeEnable: true,
      });
      this.map.addControl(new this.AMap.Scale());
      this.map.addControl(new this.AMap.ToolBar({ position: { right: "12px", top: "12px" } }));
      this.geocoder = new this.AMap.Geocoder({ city: "深圳" });
      this.placeSearch = new this.AMap.PlaceSearch({ pageSize: 20, pageIndex: 1, city: "深圳", citylimit: true });
      this.autoComplete = new this.AMap.AutoComplete({ city: "深圳", citylimit: true });
      this.map.on("click", (event: any) => void this.handleMapClick(event));
      this.applyHomeViewport();
      this.renderMarkers();
      if (!this.store.coordinatesReady(this.home)) this.renderLocateHomePrompt();
    } catch (error) {
      console.error("个人地图：高德地图加载失败", error);
      this.mapEl.empty();
      const empty = this.mapEl.createDiv({ cls: "personal-map-empty-state" });
      empty.createEl("h3", { text: "高德地图加载失败" });
      empty.createEl("p", { text: "请检查网络、JS API Key、安全密钥和高德控制台中的 Key 类型。地点 Markdown 不受影响。" });
      this.setStatus("地图加载失败，请检查高德配置");
    }
  }

  private renderLocateHomePrompt(): void {
    if (!this.home) return;
    this.detailEl.empty();
    this.detailEl.createEl("h3", { text: "首次定位家庭中心" });
    this.detailEl.createEl("p", { text: "家庭笔记已有地址，但尚未确认坐标。系统会先在高德中查找并显示临时标点，确认或调整后才写入 Markdown。" });
    const button = this.detailEl.createEl("button", { text: "查找家庭地址", cls: "mod-cta" });
    button.addEventListener("click", () => void this.locateHome());
    const manual = this.detailEl.createEl("button", { text: "在地图上选择家庭中心" });
    manual.addEventListener("click", () => {
      this.pickMode = "relocate";
      this.relocatingPlace = this.home;
      this.setStatus("请在地图上点击家庭中心位置");
      this.map?.setDefaultCursor?.("crosshair");
    });
  }

  private async locateHome(): Promise<void> {
    if (!this.home || !this.geocoder) return;
    this.setStatus("正在查找家庭地址…");
    this.geocoder.getLocation(this.home.address, (status: string, result: any) => {
      const geocode = result?.geocodes?.[0];
      const coordinates = locationNumbers(geocode?.location);
      if (status !== "complete" || !coordinates) {
        new Notice("个人地图：未能定位家庭地址，请使用地图选点");
        this.setStatus("家庭地址定位失败，可点击“地图选点”后再修改家.md");
        return;
      }
      const candidate: SearchCandidate = {
        title: this.home?.title || "家",
        address: this.home?.address || String(geocode.formattedAddress ?? ""),
        amapPoiId: "",
        ...coordinates,
        placeType: this.home?.placeType || "住宅",
        markerIcon: this.home?.markerIcon || "lucide:house",
        markerColor: this.home?.markerColor || "#2563eb",
        source: "amap-geocoder",
        home: true,
        distance: null,
      };
      this.previewCandidate(candidate, this.home ?? undefined);
      this.setStatus("请确认家庭中心；如位置不准，可先点击“调整位置”再保存");
    });
  }

  private scheduleSuggestions(): void {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    const keyword = this.searchInput.value.trim();
    if (!keyword || !this.autoComplete) return;
    this.debounceTimer = window.setTimeout(() => {
      this.autoComplete.search(keyword, (status: string, result: any) => {
        if (status !== "complete") return;
        const candidates = (result?.tips ?? []).slice(0, 10).map((tip: any) => {
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
            distance: null,
          } satisfies SearchCandidate;
        }).filter(Boolean) as SearchCandidate[];
        this.renderSearchResults(candidates, "输入建议");
      });
    }, 300);
  }

  private async searchNearby(keyword: string): Promise<void> {
    const query = keyword.trim();
    if (!query) return;
    if (!this.placeSearch) {
      new Notice("个人地图：高德服务尚未加载");
      return;
    }
    const sequence = ++this.searchSequence;
    this.setStatus(`正在搜索“${query}”…`);
    const callback = (status: string, result: any) => {
      if (sequence !== this.searchSequence) return;
      if (status !== "complete") {
        this.renderSearchResults([], `没有找到“${query}”`);
        this.setStatus(`没有找到“${query}”，可尝试更短或更准确的店名，也可以地图选点`);
        return;
      }
      const candidates = (result?.poiList?.pois ?? []).map((poi: any) => {
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
          distance: Number.isFinite(Number(poi.distance)) ? Number(poi.distance) : null,
        } satisfies SearchCandidate;
      }).filter(Boolean) as SearchCandidate[];
      this.renderSearchResults(candidates, `“${query}”的搜索结果`);
      this.setStatus(`找到 ${candidates.length} 个地点`);
    };
    if (this.store.coordinatesReady(this.home) && this.config) {
      this.placeSearch.searchNearBy(
        query,
        [this.home.longitude, this.home.latitude],
        this.config.searchRadiusMeters,
        callback,
      );
    } else {
      this.placeSearch.search(query, callback);
    }
  }

  private renderSearchResults(candidates: SearchCandidate[], heading: string): void {
    this.resultEl.empty();
    this.resultEl.createEl("h3", { text: heading });
    if (!candidates.length) {
      this.resultEl.createEl("p", { text: "暂无结果。" });
      return;
    }
    for (const candidate of candidates) {
      const row = this.resultEl.createEl("button", { cls: "personal-map-result" });
      row.createEl("strong", { text: candidate.title });
      row.createEl("span", { text: candidate.address || "地址未提供" });
      if (candidate.distance !== null) row.createEl("small", { text: `${Math.round(candidate.distance)} 米` });
      if (this.pendingBenefit) row.createEl("small", { text: "点击后创建地点并自动关联当前券" });
      row.addEventListener("click", () => {
        if (this.pendingBenefit) {
          const existing = this.store.findDuplicates(candidate, this.places)[0];
          if (existing) {
            void this.completeBenefitLink(existing);
            return;
          }
          void this.createDraft(candidate);
          return;
        }
        this.previewCandidate(candidate);
      });
    }
  }

  private previewCandidate(candidate: SearchCandidate | PlaceDraft, existing?: PlaceRecord): void {
    if (this.map && this.AMap) {
      if (this.previewMarker) this.map.remove(this.previewMarker);
      this.previewMarker = new this.AMap.Marker({
        position: [candidate.longitude, candidate.latitude],
        anchor: "bottom-center",
        content: this.buildMarkerElement(candidate.markerIcon, candidate.markerColor, true),
        zIndex: 200,
      });
      this.map.add(this.previewMarker);
      this.map.setCenter([candidate.longitude, candidate.latitude]);
    }
    this.renderPlaceEditor(candidate, existing);
  }

  private renderPlaceEditor(draft: PlaceDraft, existing?: PlaceRecord): void {
    this.detailEl.empty();
    this.detailEl.createEl("h3", {
      text: this.pendingBenefit
        ? existing ? "确认地点并关联券" : "创建地点并关联券"
        : existing ? "编辑地点" : "保存地点",
    });
    if (this.pendingBenefit) {
      this.detailEl.createEl("p", { cls: "personal-map-link-context", text: `待关联：${this.pendingBenefit.title}` });
    }
    const form = this.detailEl.createDiv({ cls: "personal-map-editor" });
    const titleInput = this.field(form, "名称", draft.title);
    const addressInput = this.field(form, "地址", draft.address);
    const typeInput = this.field(form, "自由类型", draft.placeType, "例如：餐馆、商场、公园");
    const iconInput = this.field(form, "图标", draft.markerIcon, "lucide:utensils 或 emoji:🍜");
    const colorWrap = form.createDiv({ cls: "personal-map-field" });
    colorWrap.createEl("label", { text: "颜色" });
    const colorInput = colorWrap.createEl("input", { type: "color", value: draft.markerColor || "#2563eb" });

    const common = form.createDiv({ cls: "personal-map-icon-grid" });
    for (const icon of COMMON_ICONS) {
      const button = common.createEl("button", { attr: { type: "button", title: icon, "aria-label": icon } });
      try { setIcon(button, icon); } catch { button.setText("●"); }
      button.addEventListener("click", () => { iconInput.value = `lucide:${icon}`; });
    }
    for (const emoji of ["🍜", "☕", "🍰", "🛒", "🏥", "🏫", "🌳", "📍"]) {
      const button = common.createEl("button", { text: emoji, attr: { type: "button", title: emoji } });
      button.addEventListener("click", () => { iconInput.value = `emoji:${emoji}`; });
    }

    const recentStyles = this.store.getRecentStyles(this.places);
    if (recentStyles.length) {
      form.createEl("label", { text: "最近使用" });
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
      text: this.pendingBenefit
        ? existing ? "保存地点并自动关联券" : "创建地点并自动关联券"
        : existing ? "保存修改" : "创建地点笔记",
      cls: "mod-cta",
    });
    save.addEventListener("click", () => void this.saveEditorDraft({
      ...draft,
      title: titleInput.value.trim(),
      address: addressInput.value.trim(),
      placeType: typeInput.value.trim(),
      markerIcon: iconInput.value.trim() || "lucide:map-pin",
      markerColor: colorInput.value,
    }, existing));
    const relocate = actions.createEl("button", { text: "调整位置" });
    relocate.addEventListener("click", () => {
      this.pickMode = "relocate";
      this.relocatingPlace = existing ?? null;
      this.setStatus("请在地图上点击新的标点位置");
      this.map?.setDefaultCursor?.("crosshair");
    });
    if (existing) {
      const open = actions.createEl("button", { text: "打开笔记" });
      open.addEventListener("click", () => void this.store.openPlace(existing));
    }
    if (this.pendingBenefit) {
      const cancel = actions.createEl("button", { text: "取消关联" });
      cancel.addEventListener("click", () => this.cancelBenefitLink());
    }
  }

  private field(container: HTMLElement, label: string, value: string, placeholder = ""): HTMLInputElement {
    const wrap = container.createDiv({ cls: "personal-map-field" });
    wrap.createEl("label", { text: label });
    return wrap.createEl("input", { type: "text", value, placeholder });
  }

  private async saveEditorDraft(draft: PlaceDraft, existing?: PlaceRecord): Promise<void> {
    if (!this.config) return;
    if (!draft.title || !Number.isFinite(draft.longitude) || !Number.isFinite(draft.latitude)) {
      new Notice("个人地图：名称和坐标不能为空");
      return;
    }
    if (existing) {
      await this.store.updatePlace(existing, draft);
      if (this.pendingBenefit) {
        await this.completeBenefitLink(existing);
        this.clearPreview();
        return;
      }
      new Notice("个人地图：地点已更新，个人经验正文未改动");
      await this.refreshData();
      this.clearPreview();
      return;
    }
    const duplicates = this.store.findDuplicates(draft, this.places);
    if (duplicates.length) {
      const duplicate = duplicates[0];
      new ConfirmationModal(
        this,
        "发现可能重复的地点",
        `已有“${duplicate.title}”。建议打开现有笔记，避免重复标点。`,
        "仍然创建",
        async () => { await this.createDraft(draft); },
      ).open();
      const open = this.detailEl.createEl("button", { text: `打开已有地点：${duplicate.title}` });
      open.addEventListener("click", () => void this.store.openPlace(duplicate));
      if (this.pendingBenefit) {
        const link = this.detailEl.createEl("button", { text: `自动关联已有地点：${duplicate.title}`, cls: "mod-cta" });
        link.addEventListener("click", () => void this.completeBenefitLink(duplicate));
      }
      return;
    }
    await this.createDraft(draft);
  }

  private async createDraft(draft: PlaceDraft): Promise<void> {
    if (!this.config) return;
    const created = await this.store.createPlace(this.config, draft);
    if (this.pendingBenefit) {
      await this.completeBenefitLink(created);
      this.clearPreview();
      return;
    }
    new Notice(`个人地图：已创建 ${created.title}`);
    await this.refreshData();
    this.clearPreview();
    this.showDetails(this.places.find((place) => place.file.path === created.file.path) ?? created);
  }

  private async handleMapClick(event: any): Promise<void> {
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
          distance: null,
        };
        this.previewCandidate({ ...current, ...coordinates, address: address || current.address }, relocating);
      } else {
        this.previewCandidate({
          title: address ? address.split(/[省市区]/).filter(Boolean).at(-1) || "自定义地点" : "自定义地点",
          address,
          amapPoiId: "",
          ...coordinates,
          placeType: "",
          markerIcon: "lucide:map-pin",
          markerColor: "#2563eb",
          source: "manual",
          distance: null,
        });
      }
    });
  }

  private reverseGeocode(longitude: number, latitude: number, callback: (address: string) => void): void {
    if (!this.geocoder) {
      callback("");
      return;
    }
    this.geocoder.getAddress([longitude, latitude], (status: string, result: any) => {
      callback(status === "complete" ? String(result?.regeocode?.formattedAddress ?? "") : "");
    });
  }

  private renderMarkers(): void {
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
        zIndex: place.home ? 120 : 100,
      });
      marker.on("click", () => {
        if (this.pendingBenefit) void this.completeBenefitLink(place);
        else this.showDetails(place);
      });
      this.markers.push(marker);
    }
    if (this.markers.length) this.map.add(this.markers);
  }

  private buildMarkerElement(iconSpec: string, color: string, preview = false, home = false): HTMLDivElement {
    const marker = document.createElement("div");
    marker.className = `personal-map-marker${preview ? " is-preview" : ""}${home ? " is-home" : ""}`;
    marker.style.setProperty("--personal-map-marker-color", color || "#2563eb");
    const icon = parseMarkerIcon(iconSpec);
    if (icon.kind === "emoji") {
      marker.textContent = icon.value;
      marker.classList.add("is-emoji");
    } else {
      try {
        setIcon(marker, icon.value);
        if (!marker.querySelector("svg")) setIcon(marker, "map-pin");
      } catch {
        setIcon(marker, "map-pin");
      }
    }
    return marker;
  }

  private showDetails(place: PlaceRecord): void {
    this.selectedPlaceId = place.placeId || null;
    this.detailEl.empty();
    const heading = this.detailEl.createDiv({ cls: "personal-map-detail-heading" });
    heading.appendChild(this.buildMarkerElement(place.markerIcon, place.markerColor, false, place.home));
    const text = heading.createDiv();
    text.createEl("h3", { text: place.title });
    if (place.placeType) text.createEl("small", { text: place.placeType });
    if (place.address) this.detailEl.createEl("p", { text: place.address });
    if (this.pendingBenefit) {
      const linkBox = this.detailEl.createDiv({ cls: "personal-map-link-box" });
      linkBox.createEl("strong", { text: `关联“${this.pendingBenefit.title}”` });
      linkBox.createEl("p", { text: "确认这是该券可用的实际门店后再关联。" });
      const link = linkBox.createEl("button", { text: "确认地点并自动关联券", cls: "mod-cta" });
      link.addEventListener("click", () => void this.completeBenefitLink(place));
      const cancel = linkBox.createEl("button", { text: "取消" });
      cancel.addEventListener("click", () => this.cancelBenefitLink());
    }
    this.detailEl.createEl("h4", { text: "个人经验" });
    this.detailEl.createEl("p", { text: place.excerpt || "尚未记录，打开笔记后可以自由填写。" });
    if (place.tags.length) this.detailEl.createEl("p", { cls: "personal-map-tags", text: place.tags.map((tag) => `#${tag}`).join("  ") });
    const actions = this.detailEl.createDiv({ cls: "personal-map-detail-actions" });
    const open = actions.createEl("button", { text: "打开笔记", cls: "mod-cta" });
    open.addEventListener("click", () => void this.store.openPlace(place));
    const edit = actions.createEl("button", { text: "编辑标点" });
    edit.addEventListener("click", () => {
      const draft = placeToDraft(place);
      if (draft) this.previewCandidate(draft, place);
      else new Notice("个人地图：该地点尚未设置坐标");
    });
    if (hasCoordinates(place)) {
      const amap = actions.createEl("button", { text: "在高德打开" });
      amap.addEventListener("click", () => {
        const uri = `https://uri.amap.com/marker?position=${place.longitude},${place.latitude}&name=${encodeURIComponent(place.title)}&src=personal-map&callnative=1`;
        window.open(uri, "_blank");
      });
    }
    if (!place.home) {
      const remove = actions.createEl("button", { text: "移到回收站" });
      remove.addEventListener("click", () => {
        new ConfirmationModal(
          this,
          "移除地点",
          `将“${place.title}”移动到系统回收站，可在回收站恢复。`,
          "移到回收站",
          async () => {
            await this.store.deletePlace(place);
            new Notice(`个人地图：已将 ${place.title} 移到回收站`);
            await this.refreshData();
            this.detailEl.empty();
          },
        ).open();
      });
    }
    const benefits = this.detailEl.createDiv({ cls: "personal-map-linked-benefits" });
    void this.renderLinkedBenefits(place, benefits);
  }

  private renderLinkingPrompt(): void {
    if (!this.pendingBenefit) return;
    this.detailEl.empty();
    this.detailEl.createEl("h3", { text: "关联券到地点" });
    this.detailEl.createEl("p", { text: this.pendingBenefit.title });
    if (this.pendingBenefit.merchantName) this.detailEl.createEl("p", { text: `商户：${this.pendingBenefit.merchantName}` });
    if (this.benefitQueueTotal > 1) {
      this.detailEl.createEl("p", { text: `队列进度：${this.benefitQueueCompleted + 1}/${this.benefitQueueTotal}` });
    }
    this.detailEl.createEl("p", { text: "从高德搜索结果、已有标点或地图选点中确认实际门店；地点确认或创建成功后会自动关联当前券。" });
    if (this.pendingBenefitQueue.length) {
      const skip = this.detailEl.createEl("button", { text: "跳过这张" });
      skip.addEventListener("click", () => void this.skipCurrentBenefit());
    }
    const cancel = this.detailEl.createEl("button", { text: this.benefitQueueTotal > 1 ? "取消本次导入" : "取消关联" });
    cancel.addEventListener("click", () => this.cancelBenefitLink());
  }

  private async skipCurrentBenefit(): Promise<void> {
    this.pendingBenefit = null;
    this.benefitQueueCompleted += 1;
    const next = this.pendingBenefitQueue.shift();
    if (next) await this.prepareBenefitLink(next);
    else this.finishBenefitImport("已完成券地点导入队列");
  }

  private cancelBenefitLink(): void {
    this.searchSequence += 1;
    this.pendingBenefit = null;
    this.pendingBenefitQueue = [];
    this.benefitQueueTotal = 0;
    this.benefitQueueCompleted = 0;
    this.selectedPlaceId = null;
    this.clearPreview();
    this.renderOfflineList();
    this.detailEl.empty();
    this.setStatus(`${this.places.length} 个地点 · 已取消关联`);
  }

  private async completeBenefitLink(place: PlaceRecord): Promise<void> {
    const source = this.pendingBenefit;
    if (!source) return;
    this.searchSequence += 1;
    this.selectedPlaceId = place.placeId;
    this.pendingBenefit = null;
    try {
      const changed = await this.store.linkBenefitToPlace(source, place);
      new Notice(changed ? `个人地图：已自动将“${source.title}”关联到 ${place.title}` : `个人地图：这张券已经关联到 ${place.title}`);
      await this.refreshData();
      this.clearPreview();
      this.benefitQueueCompleted += 1;
      const next = this.pendingBenefitQueue.shift();
      if (next) {
        await this.prepareBenefitLink(next);
        return;
      }
      const current = this.places.find((candidate) => candidate.placeId === place.placeId) ?? place;
      this.showDetails(current);
      this.finishBenefitImport(`已关联：${source.title} → ${place.title}`);
    } catch (error) {
      this.pendingBenefit = source;
      console.error("个人地图：关联券到地点失败", error);
      new Notice("个人地图：关联失败，券笔记未被改写");
      this.renderLinkingPrompt();
    }
  }

  private finishBenefitImport(status: string): void {
    this.searchSequence += 1;
    this.pendingBenefit = null;
    this.pendingBenefitQueue = [];
    this.benefitQueueTotal = 0;
    this.benefitQueueCompleted = 0;
    this.setStatus(status);
  }

  private async renderLinkedBenefits(place: PlaceRecord, container: HTMLElement): Promise<void> {
    const benefits = this.store.loadActiveBenefitsForPlace(place);
    if (!container.isConnected) return;
    container.empty();
    container.createEl("h4", { text: `可用券（${benefits.length}）` });
    if (!benefits.length) {
      container.createEl("p", { text: "暂无关联的有效券。" });
      return;
    }
    for (const benefit of benefits) {
      const row = container.createEl("button", { cls: "personal-map-benefit-row" });
      row.createEl("strong", { text: benefit.title });
      const details = [benefit.validTo ? `有效期至 ${benefit.validTo}` : "未填写到期日", benefit.purchasePrice !== null ? `¥${benefit.purchasePrice.toFixed(2)}` : ""].filter(Boolean).join(" · ");
      row.createEl("span", { text: details });
      row.addEventListener("click", () => void this.store.openFile(benefit.file));
    }
  }

  private populateFilters(): void {
    if (!this.typeFilter || !this.tagFilter) return;
    const selectedType = this.typeFilter.value;
    const selectedTag = this.tagFilter.value;
    const types = [...new Set(this.places.map((place) => place.placeType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const tags = [...new Set(this.places.flatMap((place) => place.tags))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    this.typeFilter.empty();
    this.typeFilter.createEl("option", { text: "全部类型", value: "" });
    for (const type of types) this.typeFilter.createEl("option", { text: type, value: type });
    this.typeFilter.value = types.includes(selectedType) ? selectedType : "";
    this.tagFilter.empty();
    this.tagFilter.createEl("option", { text: "全部标签", value: "" });
    for (const tag of tags) this.tagFilter.createEl("option", { text: `#${tag}`, value: tag });
    this.tagFilter.value = tags.includes(selectedTag) ? selectedTag : "";
  }

  private renderOfflineList(): void {
    this.resultEl.empty();
    this.resultEl.createEl("h3", { text: "已保存地点" });
    if (!this.places.length) {
      this.resultEl.createEl("p", { text: "还没有地点笔记。" });
      return;
    }
    for (const place of this.places) {
      const row = this.resultEl.createEl("button", { cls: "personal-map-result" });
      row.createEl("strong", { text: place.title });
      row.createEl("span", { text: place.address || "尚未填写地址" });
      if (!hasCoordinates(place)) row.createEl("small", { text: "等待定位" });
      row.addEventListener("click", () => this.showDetails(place));
    }
  }

  private applyHomeViewport(): void {
    if (!this.map || !this.AMap || !this.config || !this.store.coordinatesReady(this.home)) return;
    this.map.setZoomAndCenter(this.initialZoom(this.home.latitude), [this.home.longitude, this.home.latitude], true);
    const area = boundsAround(this.home.longitude, this.home.latitude, this.config.panLimitMeters);
    this.map.setLimitBounds(new this.AMap.Bounds(area.southWest, area.northEast));
  }

  private focusHome(): void {
    if (!this.store.coordinatesReady(this.home)) {
      new Notice("个人地图：请先定位家庭中心");
      this.renderLocateHomePrompt();
      return;
    }
    this.map?.setZoomAndCenter?.(this.initialZoom(this.home.latitude), [this.home.longitude, this.home.latitude]);
    this.showDetails(this.home);
  }

  private initialZoom(latitude: number): number {
    const radius = this.config?.initialRadiusMeters ?? 3000;
    return zoomForRadius(latitude, radius, this.mapEl.clientWidth, this.mapEl.clientHeight);
  }

  private clearPreview(): void {
    if (this.previewMarker && this.map) this.map.remove(this.previewMarker);
    this.previewMarker = null;
  }

  private clearMapObjects(): void {
    this.clearPreview();
    if (this.map && this.markers.length) this.map.remove(this.markers);
    this.markers = [];
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.setText(text);
  }
}
