import { benefitAvailability, matchesBenefitScope, searchBenefits, sortBenefits, type BenefitScope } from "./benefits";
import AMapLoader from "@amap/amap-jsapi-loader";
import {
  App,
  SuggestModal,
  ItemView,
  Modal,
  Notice,
  setIcon,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";
import { PLACE_CATEGORIES, categoryForPlace, suggestCategory } from "./categories";
import { boundsAround, distanceMeters, hasCoordinates, normalizeText, parseMarkerIcon, zoomForRadius } from "./helpers";
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

export class BenefitSourceModal extends SuggestModal<BenefitLinkSource | TFolder> {
  private benefitScope: BenefitScope = "available";
  private readonly sources: BenefitLinkSource[];
  private readonly folders: TFolder[];
  constructor(app: App, store: PersonalMapStore, private readonly onChoose: (item: TFile | TFolder, scope: BenefitScope) => void) {
    super(app);
    this.limit = 100;
    this.sources = app.vault.getMarkdownFiles().map(file => store.getBenefitLinkSource(file)).filter((source): source is BenefitLinkSource => source !== null);
    this.folders = app.vault.getAllLoadedFiles().filter((item): item is TFolder => item instanceof TFolder && item.path !== "/" && item.path.length > 0 && this.sources.some(s => s.file.path.startsWith(`${item.path}/`)));
    this.setPlaceholder("搜索券名或商户；默认仅当前可用券");
    const controls = document.createElement("div"); controls.className = "personal-map-benefit-controls";
    const label = document.createElement("label"); label.textContent = "券状态 ";
    const select = document.createElement("select"); select.setAttribute("aria-label", "选择券状态");
    for (const [value, text] of [["available", "当前可用"], ["history", "历史 / 不可用"], ["all", "全部（可用优先）"]]) {
      const option = document.createElement("option"); option.value = value; option.textContent = text; select.appendChild(option);
    }
    label.appendChild(select); controls.appendChild(label);
    const hint = document.createElement("small"); hint.textContent = "按状态和有效期区分；选文件夹只导入当前范围内的券。"; controls.appendChild(hint);
    this.inputEl.parentElement!.classList.add("personal-map-benefit-picker-input");
    this.inputEl.parentElement!.insertBefore(controls, this.inputEl);
    select.addEventListener("change", () => {
      this.benefitScope = select.value as BenefitScope;
      this.inputEl.dispatchEvent(new Event("input"));
      this.inputEl.focus();
    });
  }
  getSuggestions(query: string): Array<BenefitLinkSource | TFolder> {
    const sources = searchBenefits(this.sources, query, this.benefitScope);
    const words = query.trim().split(/\s+/).map(normalizeText).filter(Boolean);
    const folders = this.folders.filter(folder => words.every(word => normalizeText(folder.path).includes(word))
      && this.sources.some(s => s.file.path.startsWith(`${folder.path}/`) && matchesBenefitScope(s, this.benefitScope)))
      .sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
    // Keep single coupons ahead of batch folders, and preserve availability ordering during search.
    return [...sources, ...folders];
  }
  renderSuggestion(item: BenefitLinkSource | TFolder, el: HTMLElement): void {
    if (item instanceof TFolder) {
      const count = this.sources.filter(s => s.file.path.startsWith(`${item.path}/`) && matchesBenefitScope(s, this.benefitScope)).length;
      el.createEl("strong", { text: `📁 券文件夹 · ${count} 张符合当前范围` });
      el.createDiv({ text: item.path, cls: "personal-map-benefit-meta" });
      return;
    }
    const status = benefitAvailability(item);
    el.createEl("strong", { text: `${status.available ? "🟢" : "⚪"} ${status.label} · ${item.title}` });
    el.createDiv({ cls: "personal-map-benefit-meta", text: [item.merchantName, item.validFrom ? `起 ${item.validFrom}` : "", item.validTo ? `至 ${item.validTo}` : "未填写到期日"].filter(Boolean).join(" · ") });
    el.createDiv({ cls: "personal-map-benefit-meta", text: item.file.path });
  }
  onChooseSuggestion(item: BenefitLinkSource | TFolder): void {
    this.onChoose(item instanceof TFolder ? item : item.file, this.benefitScope);
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
  private collapsedGroups = new Set<string>();
  private focusedMarker: any = null;
  private searchScope!: HTMLSelectElement;
  private categoryFilter!: HTMLSelectElement;
  private benefitFilter!: HTMLSelectElement;
  private sortOrder!: HTMLSelectElement;
  private activeBenefits = new Map<string, ReturnType<PersonalMapStore["loadActiveBenefitsForPlace"]>>();
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
    if (this.config) await this.initializeMap();
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
    this.searchScope.value = "all";
    this.searchInput.placeholder = "搜索高德地点及我的收藏";
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
    this.searchScope = searchWrap.createEl("select", { attr: { "aria-label": "搜索范围" } });
    this.searchScope.createEl("option", { value: "saved", text: "仅我的收藏" });
    this.searchScope.createEl("option", { value: "all", text: "所有地点" });
    this.searchScope.addEventListener("change", () => {
      this.searchSequence += 1;
      if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
      this.searchInput.placeholder = this.searchScope.value === "saved" ? "搜索收藏的店名、地址、经验" : "搜索高德地点及我的收藏";
      this.renderOfflineList();
    });
    this.searchInput = searchWrap.createEl("input", {
      type: "search",
      placeholder: "搜索收藏的店名、地址、经验",
      attr: { "aria-label": "搜索地点" },
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
    this.textFilter.addEventListener("input", () => this.updateCollection());
    this.typeFilter = toolbar.createEl("select", { attr: { "aria-label": "按类型筛选" } });
    this.typeFilter.addEventListener("change", () => this.updateCollection());
    this.tagFilter = toolbar.createEl("select", { attr: { "aria-label": "按标签筛选" } });
    this.tagFilter.addEventListener("change", () => this.updateCollection());

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
    refreshButton.addEventListener("click", () => void (async () => {
      await this.refreshData();
      if (this.config && !this.map) await this.initializeMap();
    })());
    const importBenefitButton = toolbar.createEl("button", { text: "从券添加地点" });
    importBenefitButton.addEventListener("click", () => this.openBenefitSourcePicker());

    this.statusEl = container.createDiv({ cls: "personal-map-status" });
    this.sourceEl = container.createDiv({ cls: "personal-map-sources" });
    const workspace = container.createDiv({ cls: "personal-map-workspace" });
    const collection = workspace.createDiv({ cls: "personal-map-collection" });
    const controls = collection.createDiv({ cls: "personal-map-collection-controls" });
    controls.createEl("strong", { text: "我的收藏" });
    this.categoryFilter = controls.createEl("select", { attr: { "aria-label": "按团购分类" } });
    this.categoryFilter.createEl("option", { value: "", text: "全部团购分类" });
    this.benefitFilter = controls.createEl("select", { attr: { "aria-label": "按券状态筛选" } });
    for (const [value, text] of [["", "全部券状态"], ["available", "有关联可用券"], ["soon", "7 天内到期"], ["none", "无关联可用券"], ["daily", "日常直去（无需团购）"]]) {
      this.benefitFilter.createEl("option", { value, text });
    }
    this.sortOrder = controls.createEl("select", { attr: { "aria-label": "收藏排序" } });
    for (const [value, text] of [["category", "按分类分组"], ["name", "按名称排序"], ["distance", "离家由近到远"], ["expiry", "券快到期优先"], ["updated", "最近更新优先"]]) {
      this.sortOrder.createEl("option", { value, text });
    }
    for (const control of [this.categoryFilter, this.benefitFilter, this.sortOrder]) control.addEventListener("change", () => this.updateCollection());
    const reset = controls.createEl("button", { text: "清除筛选" });
    reset.addEventListener("click", () => {
      for (const input of [this.searchInput, this.textFilter, this.typeFilter, this.tagFilter, this.categoryFilter, this.benefitFilter]) input.value = "";
      this.searchSequence += 1;
      this.updateCollection();
    });
    this.resultEl = collection.createDiv({ cls: "personal-map-results" });
    this.mapEl = workspace.createDiv({ cls: "personal-map-canvas" });
    this.detailEl = workspace.createDiv({ cls: "personal-map-details" });
  }

  async refreshData(): Promise<void> {
    try {
      this.config = await this.store.loadConfig();
      await this.refreshPlacesFromCurrentConfig();
    } catch (error) {
      this.config = null;
      this.home = null;
      this.places = [];
      this.clearMapObjects();
      this.map?.destroy();
      this.map = null;
      this.mapEl.empty();
      this.resultEl.empty();
      this.detailEl.empty();
      const message = error instanceof Error ? error.message : String(error);
      this.mapEl.createEl("p", { text: message });
      this.setStatus(message);
    }
  }

  private async refreshPlacesFromCurrentConfig(): Promise<void> {
    if (!this.config) return;
    this.places = await this.store.loadPlaces(this.config);
    this.home = this.store.findHome(this.places);
    this.activeBenefits = new Map(this.places.map(place => [place.placeId, this.store.loadActiveBenefitsForPlace(place)]));
    this.populateFilters();
    this.renderPlaceSource();
    this.renderOfflineList();
    if (this.map) {
      this.configureSearchServices();
      this.renderMarkers();
    }
    if (this.selectedPlaceId) {
      const selected = this.places.find((place) => place.placeId === this.selectedPlaceId);
      if (selected) {
        this.showDetails(selected, false);
        if (this.filteredPlaces().includes(selected)) this.highlightPlace(selected);
        else this.clearFocus();
      }
    }
    this.setStatus(`${this.places.length} 个地点 · 数据来自 ${this.config.placesFolder}`);
  }

  private openBenefitSourcePicker(): void {
    new BenefitSourceModal(
      this.app,
      this.store,
      (item, scope) => void this.importBenefitSource(item, scope),
    ).open();
  }

  private async importBenefitSource(item: TFile | TFolder, scope: BenefitScope = "available"): Promise<void> {
    const files = item instanceof TFile
      ? [item]
      : this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${item.path}/`));
    const sources = sortBenefits(files
      .map((file) => this.store.getBenefitLinkSource(file))
      .filter((source): source is BenefitLinkSource => source !== null && matchesBenefitScope(source, scope)));
    if (item instanceof TFolder) new Notice(`个人地图：已建立 ${sources.length} 张券的地点关联队列`);
    await this.startBenefitImport(sources);
  }

  private renderPlaceSource(): void {
    if (!this.sourceEl || !this.config) return;
    this.sourceEl.empty();
    this.sourceEl.createEl("span", { cls: "personal-map-legend", text: "🟢 券：关联可用券　🔵 常：日常直去（无需团购）　无角标：无关联可用券" });
    this.sourceEl.createEl("span", { text: "地点主档" });
    this.sourceEl.createEl("span", { cls: "personal-map-source-chip is-primary", text: this.config.placesFolder });
    this.sourceEl.createEl("span", { cls: "personal-map-source-chip", text: `搜索：${this.config.searchCity || "全国（附近搜索使用中心坐标）"}` });
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
        : null;
      const initialZoom = center ? this.initialZoom(center[1]) : 10;
      this.mapEl.empty();
      this.map = new this.AMap.Map(this.mapEl, {
        viewMode: "2D",
        zoom: initialZoom,
        ...(center ? { center } : {}),
        mapStyle: "amap://styles/whitesmoke",
        resizeEnable: true,
      });
      this.map.addControl(new this.AMap.Scale());
      this.map.addControl(new this.AMap.ToolBar({ position: { right: "12px", top: "12px" } }));
      this.configureSearchServices();
      this.map.on("click", (event: any) => void this.handleMapClick(event));
      this.applyHomeViewport();
      this.renderMarkers();
      if (this.selectedPlaceId) {
        const selected = this.places.find(p => p.placeId === this.selectedPlaceId);
        if (selected) this.focusPlace(selected);
      }
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

  private configureSearchServices(): void {
    if (!this.AMap) return;
    const city = this.config?.searchCity.trim() || "全国";
    const citylimit = city !== "全国";
    this.geocoder = new this.AMap.Geocoder({ city });
    this.placeSearch = new this.AMap.PlaceSearch({ pageSize: 20, pageIndex: 1, city, citylimit });
    this.autoComplete = new this.AMap.AutoComplete({ city, citylimit });
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
    const sequence = ++this.searchSequence;
    if (this.searchScope.value === "saved" || !keyword) { this.updateCollection(); return; }
    this.renderOfflineList();
    if (!this.autoComplete) return;
    this.debounceTimer = window.setTimeout(() => {
      this.autoComplete.search(keyword, (status: string, result: any) => {
        if (sequence !== this.searchSequence || this.searchScope.value !== "all" || status !== "complete") return;
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
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.searchSequence += 1;
    if (!query || this.searchScope.value === "saved") { this.updateCollection(); return; }
    if (!this.placeSearch) {
      this.renderOfflineList();
      new Notice("个人地图：高德服务尚未加载，先显示收藏结果");
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
    this.appendSavedPlaces();
    this.resultEl.createEl("h3", { text: `高德 · ${heading}` });
    if (!candidates.length) {
      this.resultEl.createEl("p", { text: "暂无结果。" });
      return;
    }
    for (const candidate of candidates) {
      const row = this.resultEl.createEl("button", { cls: "personal-map-result" });
      const existing = this.store.findDuplicates(candidate, this.places)[0];
      row.createEl("strong", { text: `${existing ? "已收藏 · " : ""}${candidate.title}` });
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
        if (existing) this.showDetails(existing);
        else this.previewCandidate(candidate);
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
    const category = !existing && suggestCategory(candidate.title, this.pendingBenefit?.title);
    this.renderPlaceEditor(category ? { ...candidate, markerIcon: `emoji:${category.emoji}`, markerColor: category.color, placeType: category.label } : candidate, existing);
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
    for (const category of PLACE_CATEGORIES) {
      const button = common.createEl("button", { attr: { type: "button", title: category.label, "aria-label": category.label, "aria-pressed": String(iconInput.value === `emoji:${category.emoji}`) } });
      button.createEl("span", { text: category.emoji });
      button.createEl("small", { text: category.label });
      button.addEventListener("click", () => {
        iconInput.value = `emoji:${category.emoji}`;
        colorInput.value = category.color;
        typeInput.value = category.label;
        common.querySelectorAll("button").forEach(el => el.setAttribute("aria-pressed", String(el === button)));
      });
    }
    for (const [icon, label] of [["house", "住宅"], ["map-pin", "通用地点"]]) {
      const button = common.createEl("button", { attr: { type: "button", title: label } });
      const glyph = button.createSpan(); setIcon(glyph, icon);
      button.createEl("small", { text: label });
      button.addEventListener("click", () => { iconInput.value = `lucide:${icon}`; });
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
    for (const place of this.filteredPlaces()) {
      if (!hasCoordinates(place)) continue;
      if (place.home && this.config?.showHomeMarker === false) continue;
      const marker = new this.AMap.Marker({
        position: [place.longitude, place.latitude],
        title: place.title,
        anchor: "bottom-center",
        content: this.buildPlaceMarkerElement(place),
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

  private buildPlaceMarkerElement(place: PlaceRecord, color = place.markerColor): HTMLDivElement {
    const wrapper = document.createElement("div"); wrapper.className = "personal-map-place-marker";
    wrapper.appendChild(this.buildMarkerElement(place.markerIcon, color, false, place.home));
    const count = this.activeBenefits.get(place.placeId)?.length ?? 0;
    const states: string[] = [];
    if (count) {
      const badge = document.createElement("span"); badge.className = "personal-map-marker-badge has-benefit";
      badge.textContent = `券${count}`; wrapper.appendChild(badge); states.push(`${count} 张关联可用券`);
    }
    if (place.dailyVisit) {
      const badge = document.createElement("span"); badge.className = "personal-map-marker-badge is-daily";
      badge.textContent = "常"; wrapper.appendChild(badge); states.push("日常直去，无需团购");
    }
    wrapper.title = `${place.title} · ${states.join(" · ") || "无关联可用券"}`;
    wrapper.setAttribute("aria-label", wrapper.title);
    return wrapper;
  }

  private buildMarkerElement(iconSpec: string, color: string, preview = false, home = false): HTMLDivElement {
    const marker = document.createElement("div");
    marker.className = `personal-map-marker${preview ? " is-preview" : ""}${home ? " is-home" : ""}`;
    marker.style.setProperty("--personal-map-marker-color", color || "#2563eb");
    const icon = parseMarkerIcon(iconSpec);
    if (icon.kind === "emoji") {
      marker.dataset.emoji = icon.value;
      marker.setAttribute("aria-label", icon.value);
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

  private showDetails(place: PlaceRecord, focus = true): void {
    this.selectedPlaceId = place.placeId || null;
    this.renderOfflineList();
    if (focus) this.focusPlace(place);
    this.detailEl.empty();
    const heading = this.detailEl.createDiv({ cls: "personal-map-detail-heading" });
    heading.appendChild(this.buildPlaceMarkerElement(place));
    const text = heading.createDiv();
    text.createEl("h3", { text: place.title });
    if (place.placeType) text.createEl("small", { text: place.placeType });
    this.detailEl.createEl("p", { cls: "personal-map-place-state", text: [place.dailyVisit ? "🔵 日常直去 · 无需团购" : "", (this.activeBenefits.get(place.placeId)?.length ?? 0) ? `🟢 ${this.activeBenefits.get(place.placeId)!.length} 张关联可用券` : "暂无关联可用券"].filter(Boolean).join(" ｜ ") });
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
    const center = actions.createEl("button", { text: "定位中心", cls: "mod-cta" });
    center.addEventListener("click", () => this.focusPlace(place));
    const open = actions.createEl("button", { text: "打开笔记" });
    open.addEventListener("click", () => void this.store.openPlace(place));
    const daily = actions.createEl("button", { text: place.dailyVisit ? "取消日常直去标记" : "标为日常直去", attr: { "aria-pressed": String(Boolean(place.dailyVisit)) } });
    daily.addEventListener("click", () => void (async () => {
      daily.disabled = true;
      try {
        await this.store.setDailyVisit(place, !place.dailyVisit);
        place.dailyVisit = !place.dailyVisit;
        this.updateCollection();
        this.showDetails(place, false);
      } catch (error) {
        daily.disabled = false;
        console.error("个人地图：日常直去标记保存失败", error);
        new Notice("日常直去标记保存失败，请重试");
      }
    })());
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
    this.detailEl.createEl("p", { text: `${benefitAvailability(this.pendingBenefit).label} · ${this.pendingBenefit.title}` });
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
    const selectedCategory = this.categoryFilter.value;
    this.categoryFilter.empty();
    this.categoryFilter.createEl("option", { value: "", text: "全部团购分类" });
    const counts = new Map<string, number>();
    for (const place of this.places) { const key = categoryForPlace(place); counts.set(key, (counts.get(key) ?? 0) + 1); }
    for (const [label, count] of [...counts].sort(([a], [b]) => a.localeCompare(b, "zh-CN"))) this.categoryFilter.createEl("option", { value: label, text: `${label}（${count}）` });
    this.categoryFilter.value = counts.has(selectedCategory) ? selectedCategory : "";
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

  private updateCollection(): void {
    this.renderOfflineList();
    this.renderMarkers();
    this.clearFocus();
    const selected = this.places.find(place => place.placeId === this.selectedPlaceId);
    if (selected && this.filteredPlaces().includes(selected)) this.highlightPlace(selected);
  }

  private filteredPlaces(): PlaceRecord[] {
    const queries = [this.searchInput?.value ?? "", this.textFilter?.value ?? ""].map(normalizeText).filter(Boolean);
    return this.places.filter(place => {
      const haystack = normalizeText([place.title, place.address, place.placeType, categoryForPlace(place), place.excerpt, ...place.tags].join(" "));
      if (!queries.every(query => haystack.includes(query))) return false;
      if (this.typeFilter?.value && place.placeType !== this.typeFilter.value) return false;
      if (this.tagFilter?.value && !place.tags.includes(this.tagFilter.value)) return false;
      if (this.categoryFilter?.value && categoryForPlace(place) !== this.categoryFilter.value) return false;
      const benefits = this.activeBenefits.get(place.placeId) ?? [];
      const filter = this.benefitFilter?.value;
      if (filter === "daily" && !place.dailyVisit) return false;
      if (filter === "available" && !benefits.length || filter === "none" && benefits.length) return false;
      if (filter === "soon" && !benefits.some(b => this.daysUntil(b.validTo) <= 7)) return false;
      return true;
    });
  }

  private daysUntil(date: string): number {
    if (!date) return Infinity;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(`${date.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) / 86400000);
  }

  private distanceFromHome(place: PlaceRecord): number {
    return hasCoordinates(place) && this.store.coordinatesReady(this.home)
      ? distanceMeters(this.home, { longitude: place.longitude!, latitude: place.latitude! }) : Infinity;
  }

  private renderOfflineList(): void {
    const scrollTop = this.resultEl.scrollTop;
    this.resultEl.empty();
    this.appendSavedPlaces();
    this.resultEl.scrollTop = scrollTop;
  }

  private appendSavedPlaces(): void {
    const places = this.filteredPlaces();
    const order = this.sortOrder?.value ?? "category";
    const expiry = (p: PlaceRecord) => Math.min(...(this.activeBenefits.get(p.placeId) ?? []).map(b => this.daysUntil(b.validTo)));
    places.sort((a, b) => {
      let compared = 0;
      if (order === "category") compared = categoryForPlace(a).localeCompare(categoryForPlace(b), "zh-CN");
      if (order === "distance") compared = this.distanceFromHome(a) - this.distanceFromHome(b);
      if (order === "expiry") compared = expiry(a) - expiry(b);
      if (order === "updated") compared = b.updated.localeCompare(a.updated);
      return (Number.isNaN(compared) ? 0 : compared) || a.title.localeCompare(b.title, "zh-CN");
    });
    this.resultEl.createEl("h3", { text: `收藏地点 ${places.length} / ${this.places.length}` });
    if (!places.length) this.resultEl.createEl("p", { text: this.places.length ? "没有匹配的收藏，可清除筛选重试。" : "还没有地点笔记。" });
    const groups = new Map<string, HTMLElement>();
    for (const place of places) {
      const category = categoryForPlace(place);
      let container: HTMLElement = this.resultEl;
      if (order === "category") {
        if (!groups.has(category)) {
          const group = this.resultEl.createEl("details", { cls: "personal-map-group" });
          group.open = !this.collapsedGroups.has(category);
          group.addEventListener("toggle", () => {
            if (group.open) this.collapsedGroups.delete(category);
            else this.collapsedGroups.add(category);
          });
          group.createEl("summary", { text: `${category} · ${places.filter(p => categoryForPlace(p) === category).length}` });
          groups.set(category, group);
        }
        container = groups.get(category)!;
      }
      const row = container.createEl("button", { cls: `personal-map-result${place.placeId === this.selectedPlaceId ? " is-selected" : ""}`, attr: { "aria-pressed": String(place.placeId === this.selectedPlaceId) } });
      row.createEl("strong", { text: `${parseMarkerIcon(place.markerIcon).kind === "emoji" ? parseMarkerIcon(place.markerIcon).value + " " : ""}${place.title}` });
      row.createEl("span", { text: place.address || "尚未填写地址" });
      const benefits = this.activeBenefits.get(place.placeId) ?? [];
      const distance = this.distanceFromHome(place);
      const days = expiry(place);
      row.createEl("small", { text: [order !== "category" ? category : "", place.dailyVisit ? "🔵 日常直去" : "", benefits.length ? `${benefits.length} 张关联可用券${days <= 7 ? ` · ${days === 0 ? "今天" : days + "天后"}到期` : ""}` : "无关联可用券", Number.isFinite(distance) ? `距家 ${distance < 1000 ? Math.round(distance) + "米" : (distance / 1000).toFixed(1) + "公里"}` : "", !hasCoordinates(place) ? "等待定位" : ""].filter(Boolean).join(" · ") });
      row.addEventListener("click", () => this.showDetails(place));
    }
  }

  private clearFocus(): void {
    if (this.focusedMarker && this.map) this.map.remove(this.focusedMarker);
    this.focusedMarker = null;
  }

  private highlightPlace(place: PlaceRecord): void {
    if (!this.map || !this.AMap || !hasCoordinates(place)) return;
    this.clearFocus();
    const content = document.createElement("div"); content.className = "personal-map-focus";
    const marker = this.buildPlaceMarkerElement(place, "#f97316"); marker.querySelector(".personal-map-marker")?.classList.add("is-selected");
    content.appendChild(marker);
    const label = document.createElement("span"); label.className = "personal-map-focus-label"; label.textContent = place.title; content.appendChild(label);
    this.focusedMarker = new this.AMap.Marker({ position: [place.longitude, place.latitude], anchor: "bottom-center", content, zIndex: 500, bubble: false });
    this.focusedMarker.on("click", () => this.showDetails(place, false));
    this.map.add(this.focusedMarker);
  }

  private focusPlace(place: PlaceRecord): void {
    this.clearPreview();
    this.clearFocus();
    if (!hasCoordinates(place)) { this.setStatus(`“${place.title}”尚未设置坐标，请编辑标点定位。`); return; }
    if (!this.map) { this.setStatus("地图尚未加载，仍可查看地点笔记。"); return; }
    // Saved stores may lie beyond the configured home browsing boundary.
    this.map.clearLimitBounds();
    this.map.setZoomAndCenter(Math.max(16, this.map.getZoom?.() ?? 16), [place.longitude, place.latitude]);
    this.highlightPlace(place);
    this.setStatus(`已定位：${place.title} · 橙色光圈为当前门店`);
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
    this.applyHomeViewport();
    this.highlightPlace(this.home);
    this.showDetails(this.home, false);
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
    this.clearFocus();
    if (this.map && this.markers.length) this.map.remove(this.markers);
    this.markers = [];
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.setText(text);
  }
}
