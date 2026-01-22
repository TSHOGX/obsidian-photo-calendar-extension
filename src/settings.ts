import { App, PluginSettingTab, Setting } from "obsidian";
import type PhotoCalendarPlugin from "./main";
import { DEFAULT_SETTINGS, IWeekStartOption } from "./constants";

export class PhotoCalendarSettingTab extends PluginSettingTab {
  plugin: PhotoCalendarPlugin;

  constructor(app: App, plugin: PhotoCalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Start week on")
      .setDesc("Choose what day of the week to start on")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("locale", "Locale default")
          .addOption("sunday", "Sunday")
          .addOption("monday", "Monday")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (value) => {
            this.plugin.settings.weekStart = value as IWeekStartOption;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Confirm before creating new note")
      .setDesc("Show a confirmation modal before creating a new note")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.shouldConfirmBeforeCreate)
          .onChange(async (value) => {
            this.plugin.settings.shouldConfirmBeforeCreate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show photos")
      .setDesc("Display photos from daily notes in calendar cells")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPhotos)
          .onChange(async (value) => {
            this.plugin.settings.showPhotos = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Photo mode note background")
      .setDesc("Background color for dates with notes but no photos (photo mode)")
      .addColorPicker((picker) =>
        picker
          .setValue(this.plugin.settings.noteBackgroundColor)
          .onChange(async (value) => {
            this.plugin.settings.noteBackgroundColor = value;
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName("Reset photo mode note background")
      .setDesc("Restore the default color")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.noteBackgroundColor = DEFAULT_SETTINGS.noteBackgroundColor;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Photo fill mode")
      .setDesc("How photos fill calendar cells")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("cover", "Cover (crop)")
          .addOption("contain", "Contain (fit)")
          .setValue(this.plugin.settings.photoFillMode)
          .onChange(async (value) => {
            this.plugin.settings.photoFillMode = value as "cover" | "contain";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Photo frontmatter fields")
      .setDesc("Comma-separated list of frontmatter field names to check for images")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.photoFieldNames.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.photoFieldNames = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );
    new Setting(containerEl)
      .setName('Words per dot')
      .setDesc('Number of words needed to show one dot')
      .addText(text => text
        .setPlaceholder('250')
        .setValue(String(this.plugin.settings.wordsPerDot))
        .onChange(async (value) => {
          const num = parseInt(value);
          if (!isNaN(num) && num > 0) {
            this.plugin.settings.wordsPerDot = num;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('Show week numbers')
      .setDesc('Display week numbers in the calendar')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showWeekNums)
        .onChange(async (value) => {
          this.plugin.settings.showWeekNums = value;
          await this.plugin.saveSettings();
        }));
  }
}
