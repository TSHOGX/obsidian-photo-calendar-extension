import { ItemView, WorkspaceLeaf, Notice, Modal } from "obsidian";
import type { EventRef } from "obsidian";
import type { Moment } from "./types";
import { VIEW_TYPE_CALENDAR } from "./constants";
import type PhotoCalendarPlugin from "./main";
import Calendar from "./Calendar.svelte";
import { createDailyNote, getAllDailyNotes, getDailyNote } from "obsidian-daily-notes-interface";
import { getWeeklyNote, getAllWeeklyNotes, createWeeklyNote } from "./weeklyNotes";

export class CalendarView extends ItemView {
  private calendarComponent!: Calendar;
  private plugin: PhotoCalendarPlugin;
  private refreshTrigger: number = 0;
  private fileEventRefs: EventRef[] = [];
  private refreshTimeout: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: PhotoCalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Photo calendar";
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  onOpen(): Promise<void> {
    const onDateClick = (date: Moment, isNewNote: boolean) =>
      this.onDateClick(date, isNewNote);
    const onDateHover = (date: Moment, targetEl: HTMLElement) =>
      this.onDateHover(date, targetEl);
    const onWeekClick = (date: Moment, isMetaPressed: boolean) =>
      this.onWeekClick(date, isMetaPressed);

    this.calendarComponent = new Calendar({
      target: this.contentEl,
      props: {
        plugin: this.plugin,
        settings: { ...this.plugin.settings },
        onDateClick,
        onDateHover,
        onWeekClick,
        refreshTrigger: this.refreshTrigger,
      },
    });

    // Register file event listeners
    this.registerFileEvents();
    return Promise.resolve();
  }

  private registerFileEvents(): void {
    const handleFileChange = () => {
      this.refresh();
    };

    this.fileEventRefs.push(
      this.app.vault.on("create", handleFileChange),
      this.app.vault.on("modify", handleFileChange),
      this.app.vault.on("delete", handleFileChange),
      this.app.vault.on("rename", handleFileChange)
    );
  }

  private refresh(): void {
    // Debounce refresh to avoid excessive updates
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      this.refreshTrigger++;
      if (this.calendarComponent) {
        this.calendarComponent.$set({
          refreshTrigger: this.refreshTrigger,
          settings: { ...this.plugin.settings },
        });
      }
      this.refreshTimeout = null;
    }, 300);
  }

  onSettingsChanged(): void {
    this.refresh();
  }

  onClose(): Promise<void> {
    // Clear debounce timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    // Unregister file event listeners
    this.fileEventRefs.forEach((ref) => this.app.vault.offref(ref));
    this.fileEventRefs = [];

    if (this.calendarComponent) {
      this.calendarComponent.$destroy();
    }
    return Promise.resolve();
  }

  private async onDateClick(date: Moment, isNewNote: boolean): Promise<void> {
    const { workspace } = this.app;
    const dailyNote = getDailyNote(date, getAllDailyNotes());

    if (dailyNote) {
      const leaf = workspace.getLeaf(false);
      await leaf.openFile(dailyNote);
    } else if (isNewNote) {
      if (this.plugin.settings.shouldConfirmBeforeCreate) {
        const shouldCreate = await this.confirmCreateNote(date);
        if (!shouldCreate) return;
      }

      try {
        const newNote = await createDailyNote(date);
        const leaf = workspace.getLeaf(false);
        await leaf.openFile(newNote);
      } catch (err) {
        new Notice("Failed to create daily note");
        console.error("Failed to create daily note:", err);
      }
    }
  }

  private onDateHover(date: Moment, targetEl: HTMLElement): void {
    const dailyNote = getDailyNote(date, getAllDailyNotes());
    if (dailyNote) {
      this.app.workspace.trigger("hover-link", {
        event: new MouseEvent("mouseover"),
        source: VIEW_TYPE_CALENDAR,
        hoverParent: this,
        targetEl,
        linktext: dailyNote.path,
      });
    }
  }

  private async onWeekClick(date: Moment, isMetaPressed: boolean): Promise<boolean> {
    const { workspace } = this.app;
    const startOfWeek = date.clone().startOf("week");
    const weeklyNotes = getAllWeeklyNotes(this.app);
    const weeklyNote = getWeeklyNote(startOfWeek, weeklyNotes, this.app);

    if (weeklyNote) {
      const leaf = workspace.getLeaf(isMetaPressed);
      await leaf.openFile(weeklyNote);
      return true;
    }

    if (this.plugin.settings.shouldConfirmBeforeCreate) {
      const shouldCreate = await this.confirmCreateWeeklyNote(startOfWeek);
      if (!shouldCreate) return false;
    }

    try {
      const newWeeklyNote = await createWeeklyNote(this.app, startOfWeek);
      const leaf = workspace.getLeaf(isMetaPressed);
      await leaf.openFile(newWeeklyNote);
      return true;
    } catch (err) {
      new Notice("Failed to create weekly note");
      console.error("Failed to create weekly note:", err);
      return false;
    }
  }

  private async confirmCreateWeeklyNote(date: Moment): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText("Create new weekly note");
      modal.contentEl.setText(
        `Do you want to create a new weekly note for week starting ${date.format("YYYY-MM-DD")}?`
      );

      const buttonContainer = modal.contentEl.createDiv({ cls: "modal-button-container" });

      const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
      cancelButton.addEventListener("click", () => {
        modal.close();
        resolve(false);
      });

      const createButton = buttonContainer.createEl("button", {
        text: "Create",
        cls: "mod-cta",
      });
      createButton.addEventListener("click", () => {
        modal.close();
        resolve(true);
      });

      modal.open();
    });
  }

  private async confirmCreateNote(date: Moment): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText("Create new note");
      modal.contentEl.setText(
        `Do you want to create a new note for ${date.format("YYYY-MM-DD")}?`
      );

      const buttonContainer = modal.contentEl.createDiv({ cls: "modal-button-container" });

      const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
      cancelButton.addEventListener("click", () => {
        modal.close();
        resolve(false);
      });

      const createButton = buttonContainer.createEl("button", {
        text: "Create",
        cls: "mod-cta",
      });
      createButton.addEventListener("click", () => {
        modal.close();
        resolve(true);
      });

      modal.open();
    });
  }
}
