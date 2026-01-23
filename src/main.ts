import { Plugin } from "obsidian";
import { CalendarView } from "./view";
import { PhotoCalendarSettingTab } from "./settings";
import { PhotoService } from "./photoService";
import { DEFAULT_SETTINGS, ISettings, VIEW_TYPE_CALENDAR, RIBBON_ICON } from "./constants";

export default class PhotoCalendarPlugin extends Plugin {
  settings!: ISettings;
  photoService!: PhotoService;

  async onload() {
    await this.loadSettings();

    this.photoService = new PhotoService(this.app, this.settings);

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));

    this.addRibbonIcon(RIBBON_ICON, "Open calendar", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-calendar",
      name: "Open calendar",
      callback: () => {
        void this.activateView();
      }
    });

    this.addSettingTab(new PhotoCalendarSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.photoService.invalidateCache(file.path);
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.photoService.invalidateCache(file.path);
      })
    );
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
      }
    }

    if (leaf) {
      void workspace.revealLeaf(leaf);
    }
  }

  async loadSettings() {
    const data = (await this.loadData()) as Partial<ISettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.photoService?.updateSettings(this.settings);
    this.refreshOpenViews();
  }

  private refreshOpenViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    leaves.forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof CalendarView) {
        view.onSettingsChanged();
      }
    });
  }

  onunload() {
    this.photoService?.clearCache();
  }
}
