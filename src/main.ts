import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";
import { PersonalMapView, VIEW_TYPE_PERSONAL_MAP } from "./view";
import { PersonalMapStore } from "./store";
import type { AMapCredentials, PersonalMapPluginApi } from "./types";

export default class PersonalMapPlugin extends Plugin implements PersonalMapPluginApi {
  async onload(): Promise<void> {
    const store = new PersonalMapStore(this.app);
    this.registerView(VIEW_TYPE_PERSONAL_MAP, (leaf) => new PersonalMapView(leaf, this));
    this.addRibbonIcon("map-pinned", "打开个人地图", () => void this.activateView());
    this.addCommand({
      id: "open-personal-map",
      name: "打开个人地图",
      callback: () => void this.activateView(),
    });
    this.addCommand({
      id: "link-current-benefit-to-place",
      name: "将当前券关联到地图地点",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || !store.getBenefitLinkSource(file)) return false;
        if (!checking) void this.activateView(file);
        return true;
      },
    });
    this.addSettingTab(new PersonalMapSettingTab(this.app, this));

    let refreshTimer: number | null = null;
    const refresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PERSONAL_MAP)) {
          const view = leaf.view;
          if (view instanceof PersonalMapView) void view.refreshData();
        }
      }, 150);
    };
    this.register(() => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    });
    this.registerEvent(this.app.vault.on("create", refresh));
    this.registerEvent(this.app.vault.on("modify", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_PERSONAL_MAP);
  }

  private secretKey(name: "key" | "securityCode"): string {
    return `personal-map:${this.app.vault.getName()}:${name}`;
  }

  getCredentials(): AMapCredentials {
    return {
      key: window.localStorage.getItem(this.secretKey("key")) ?? "",
      securityCode: window.localStorage.getItem(this.secretKey("securityCode")) ?? "",
    };
  }

  setCredentials(credentials: AMapCredentials): void {
    window.localStorage.setItem(this.secretKey("key"), credentials.key.trim());
    window.localStorage.setItem(this.secretKey("securityCode"), credentials.securityCode.trim());
  }

  async activateView(benefitFile?: import("obsidian").TFile): Promise<void> {
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
}

class PersonalMapSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PersonalMapPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "个人地图设置" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "高德密钥仅保存在这台设备的本地存储中，不写入 Markdown 或插件源码。每台设备需要分别填写。",
    });
    const current = this.plugin.getCredentials();
    let key = current.key;
    let securityCode = current.securityCode;

    new Setting(containerEl)
      .setName("高德 JS API Key")
      .setDesc("在高德开放平台申请 Web 端（JS API）Key。")
      .addText((text) => text
        .setPlaceholder("请输入 Key")
        .setValue(key)
        .onChange((value) => { key = value; }));

    new Setting(containerEl)
      .setName("高德安全密钥")
      .setDesc("2021-12-02 之后申请的 Key 必须配合 securityJsCode 使用。")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("请输入安全密钥")
          .setValue(securityCode)
          .onChange((value) => { securityCode = value; });
      });

    new Setting(containerEl)
      .setName("保存到本机")
      .setDesc("保存后重新打开个人地图即可加载高德服务。")
      .addButton((button) => button
        .setButtonText("保存密钥")
        .setCta()
        .onClick(() => {
          this.plugin.setCredentials({ key, securityCode });
          new Notice("个人地图：高德密钥已保存在本机");
        }));
  }
}
