<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import type PhotoCalendarPlugin from "./main";
  import type { ISettings } from "./constants";
  import { moment } from "obsidian";
  import type { Moment, MomentStatic } from "./types";
  import {
    Calendar as CalendarBase,
    configureGlobalMomentLocale,
  } from "obsidian-calendar-ui";
  import { getDailyNote, getAllDailyNotes } from "obsidian-daily-notes-interface";
  import { createPhotoSource } from "./photoSource";
  import { createWordCountSource } from "./wordCountSource";

  export let plugin: PhotoCalendarPlugin;
  export let settings: ISettings;
  export let onDateClick: (date: Moment, isNewNote: boolean) => Promise<void>;
  export let onDateHover: (date: Moment, targetEl: HTMLElement) => void;
  export let onWeekClick: (date: Moment, isMetaPressed: boolean) => Promise<boolean>;
  export let refreshTrigger: number = 0;

  const momentApi = moment as unknown as MomentStatic;
  let today: Moment;
  let displayedMonth: Moment = momentApi().startOf("month");
  let containerEl: HTMLDivElement | null = null;
  let showMonthPicker = false;
  let pickerYear = displayedMonth.year();
  let pickerTop = 0;
  let pickerLeft = 0;
  let monthPickerEl: HTMLDivElement | null = null;
  let isPickerListenersAttached = false;
  let containerClickHandler: ((event: MouseEvent) => void) | null = null;
  let monthNames: string[] = momentApi.monthsShort();
  let photoUpdateToken = 0;

  $: today = getToday();
  $: sources = getSources();
  $: monthNames = today?.localeData?.()?.monthsShort?.() ?? momentApi.monthsShort();

  function getToday() {
    const { weekStart } = settings;
    configureGlobalMomentLocale("", weekStart);
    return momentApi();
  }

  function getSources() {
    if (settings.showPhotos) {
      return [createPhotoSource(plugin)];
    } else {
      return [createWordCountSource(plugin)];
    }
  }

  function handleClickDay(date: Moment) {
    const dailyNote = getDailyNote(date, getAllDailyNotes());
    void onDateClick(date, !dailyNote);
    return true;
  }

  function handleHoverDay(date: Moment, targetEl: EventTarget) {
    onDateHover(date, targetEl as HTMLElement);
    return true;
  }

  function handleClickWeek(date: Moment, isMetaPressed: boolean) {
    return onWeekClick(date, isMetaPressed);
  }

  // Heartbeat to keep today updated
  let lastDay = momentApi().date();
  let heartbeat = setInterval(() => {
    const now = momentApi();
    const currentDay = now.date();

    // Only update if the day has changed
    if (currentDay !== lastDay) {
      lastDay = currentDay;
      today = now;

      const isViewingCurrentMonth = displayedMonth.isSame(today, "month");
      if (isViewingCurrentMonth) {
        displayedMonth = now.clone().startOf("month");
      }
    }
  }, 1000 * 60);

  onDestroy(() => {
    clearInterval(heartbeat);
    detachPickerListeners();
    if (containerEl && containerClickHandler) {
      containerEl.removeEventListener("click", containerClickHandler, true);
    }
    window.removeEventListener("resize", updatePickerPosition);
  });

  onMount(() => {
    void updatePhotoBackgrounds();
    containerClickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !containerEl) return;
      const titleEl = target.closest(".nav .title") as HTMLElement | null;
      if (!titleEl || !containerEl.contains(titleEl)) return;
      event.preventDefault();
      event.stopPropagation();
      // Prevent the calendar's default reset handler.
      event.stopImmediatePropagation();
      void openMonthPicker(titleEl);
    };
    containerEl?.addEventListener("click", containerClickHandler, true);
    window.addEventListener("resize", updatePickerPosition);
  });

  $: if (displayedMonth) {
    void updatePhotoBackgrounds();
  }

  $: if (settings?.showPhotos !== undefined) {
    void updatePhotoBackgrounds();
  }

  $: if (refreshTrigger) {
    sources = getSources();
    void updatePhotoBackgrounds();
  }

  $: if (showMonthPicker) {
    pickerYear = displayedMonth.year();
    updatePickerPosition();
    attachPickerListeners();
  } else {
    detachPickerListeners();
  }

  async function openMonthPicker(anchorEl: HTMLElement) {
    pickerYear = displayedMonth.year();
    showMonthPicker = true;
    await tick();
    updatePickerPosition(anchorEl);
  }

  function closeMonthPicker() {
    showMonthPicker = false;
  }

  function updatePickerPosition(anchorOverride?: HTMLElement) {
    const anchorEl =
      anchorOverride ||
      (containerEl?.querySelector(".nav .title") as HTMLElement | null);
    if (!containerEl || !anchorEl || !monthPickerEl) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    pickerTop = anchorRect.bottom - containerRect.top + 6;
    pickerLeft = anchorRect.left - containerRect.left;
  }

  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (!target) return;
    if (monthPickerEl && monthPickerEl.contains(target)) return;
    const titleEl = containerEl?.querySelector(".nav .title");
    if (titleEl && titleEl.contains(target)) return;
    closeMonthPicker();
  }

  function handlePickerKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMonthPicker();
    }
  }

  function attachPickerListeners() {
    if (isPickerListenersAttached) return;
    isPickerListenersAttached = true;
    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handlePickerKeydown, true);
    window.addEventListener("scroll", updatePickerPosition, true);
  }

  function detachPickerListeners() {
    if (!isPickerListenersAttached) return;
    isPickerListenersAttached = false;
    document.removeEventListener("mousedown", handleOutsideClick, true);
    document.removeEventListener("keydown", handlePickerKeydown, true);
    window.removeEventListener("scroll", updatePickerPosition, true);
  }

  function selectMonth(monthIndex: number) {
    const safeYear = Number.isFinite(pickerYear)
      ? pickerYear
      : displayedMonth.year();
    displayedMonth = displayedMonth
      .clone()
      .year(safeYear)
      .month(monthIndex)
      .startOf("month");
    closeMonthPicker();
  }

  async function updatePhotoBackgrounds() {
    const updateToken = ++photoUpdateToken;
    await tick();
    await new Promise(requestAnimationFrame);

    if (!containerEl) return;
    if (updateToken !== photoUpdateToken) return;

    containerEl.style.setProperty(
      "--photo-calendar-note-bg",
      settings.noteBackgroundColor
    );

    let dayElements = Array.from(
      containerEl.querySelectorAll(".day")
    ) as HTMLElement[];

    if (dayElements.length === 0) {
      await new Promise(requestAnimationFrame);
      if (updateToken !== photoUpdateToken) return;
      dayElements = Array.from(
        containerEl.querySelectorAll(".day")
      ) as HTMLElement[];
    }

    if (!settings.showPhotos) {
      dayElements.forEach((el: HTMLElement) => {
        if (el.dataset.photoCalendarPhoto) {
          el.style.backgroundImage = "";
          el.style.backgroundSize = "";
          el.style.backgroundPosition = "";
          el.style.backgroundRepeat = "";
          delete el.dataset.photoCalendarPhoto;
          delete el.dataset.photoCalendarFill;
        }
        if (el.dataset.photoCalendarTextApplied) {
          el.style.color = "";
          el.style.textShadow = "";
          delete el.dataset.photoCalendarTextApplied;
        }
      });
      return;
    }

    const locale = momentApi().locale();
    const startOfMonth = displayedMonth.clone().locale(locale).date(1);
    const startOffset = startOfMonth.weekday();
    const startDate = startOfMonth.clone().subtract(startOffset, "days");
    const dateToElement = new Map<string, HTMLElement>();

    for (let index = 0; index < 42; index += 1) {
      const date = startDate.clone().add(index, "days");
      const el = dayElements[index];
      if (el) {
        dateToElement.set(date.format("YYYY-MM-DD"), el);
      }
    }

    const dailyNotes = getAllDailyNotes();
    const photoResults = await Promise.all(
      Object.values(dailyNotes).map(async (file) => {
        const date = momentApi(file.basename, "YYYY-MM-DD");
        if (!date.isValid()) return null;
        const el = dateToElement.get(date.format("YYYY-MM-DD"));
        if (!el) return null;
        const photo = await plugin.photoService.getPhotoForDate(file.path);
        return { el, photo };
      })
    );

    if (updateToken !== photoUpdateToken) return;

    const desiredPhotos = new Map<HTMLElement, string>();
    photoResults.forEach((result) => {
      if (!result) return;
      if (result.photo) {
        desiredPhotos.set(result.el, result.photo);
      }
    });

    dayElements.forEach((el: HTMLElement) => {
      const desiredPhoto = desiredPhotos.get(el);
      const existingPhoto = el.dataset.photoCalendarPhoto;
      const existingFill = el.dataset.photoCalendarFill;
      const fillMode = settings.photoFillMode;

      if (desiredPhoto) {
        if (existingPhoto !== desiredPhoto || existingFill !== fillMode) {
          el.style.backgroundImage = `url('${desiredPhoto}')`;
          el.style.backgroundSize = fillMode;
          el.style.backgroundPosition = "center";
          el.style.backgroundRepeat = "no-repeat";
          el.dataset.photoCalendarPhoto = desiredPhoto;
          el.dataset.photoCalendarFill = fillMode;
        }
        if (!el.classList.contains("adjacent-month")) {
          el.style.color = "white";
          el.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(0, 0, 0, 0.45)";
          el.dataset.photoCalendarTextApplied = "1";
        } else if (el.dataset.photoCalendarTextApplied) {
          el.style.color = "";
          el.style.textShadow = "";
          delete el.dataset.photoCalendarTextApplied;
        }
      } else if (existingPhoto) {
        el.style.backgroundImage = "";
        el.style.backgroundSize = "";
        el.style.backgroundPosition = "";
        el.style.backgroundRepeat = "";
        delete el.dataset.photoCalendarPhoto;
        delete el.dataset.photoCalendarFill;
        if (el.dataset.photoCalendarTextApplied) {
          el.style.color = "";
          el.style.textShadow = "";
          delete el.dataset.photoCalendarTextApplied;
        }
      }
    });
  }
</script>

<div
  class="photo-calendar"
  class:photo-calendar--photo-mode={settings.showPhotos}
  class:photo-calendar--weeknums={settings.showWeekNums}
  bind:this={containerEl}
>
<CalendarBase
  {sources}
  {today}
  onHoverDay={handleHoverDay}
  onHoverWeek={() => false}
  onContextMenuDay={() => false}
  onContextMenuWeek={() => false}
  onClickDay={handleClickDay}
  onClickWeek={handleClickWeek}
  bind:displayedMonth
  localeData={today.localeData()}
  selectedId={null}
  showWeekNums={settings.showWeekNums}
/>
{#if showMonthPicker}
  <div
    class="month-picker"
    style={`top: ${pickerTop}px; left: ${pickerLeft}px;`}
    bind:this={monthPickerEl}
  >
    <div class="month-picker__header">
      <button
        class="month-picker__year-btn"
        aria-label="Previous year"
        on:click={() => (pickerYear -= 1)}
      >
        ‹
      </button>
      <input
        class="month-picker__year-input"
        type="number"
        min="1900"
        max="2100"
        bind:value={pickerYear}
      />
      <button
        class="month-picker__year-btn"
        aria-label="Next year"
        on:click={() => (pickerYear += 1)}
      >
        ›
      </button>
    </div>
    <div class="month-picker__grid">
      {#each monthNames as monthName, index}
        <button
          class:month-picker__month={true}
          class:is-current={index === displayedMonth.month()}
          on:click={() => selectMonth(index)}
        >
          {monthName}
        </button>
      {/each}
    </div>
  </div>
{/if}
</div>

<style>
  .photo-calendar {
    position: relative;
  }

  :global(.photo-calendar--photo-mode .day.has-note:not(.has-photo)) {
    background: var(--photo-calendar-note-bg);
    border-radius: 6px;
    box-shadow: inset 0 0 0 1px var(--photo-calendar-note-border);
  }

  :global(.photo-calendar--photo-mode .day.has-note:not(.has-photo):hover) {
    background: var(--photo-calendar-note-bg-hover);
  }

  :global(.day.has-note) {
    font-weight: 600;
  }

  :global(.day.has-photo) {
    border-radius: 6px;
    overflow: hidden;
  }

  .month-picker {
    position: absolute;
    z-index: 20;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    padding: 10px;
    width: 220px;
  }

  .month-picker__header {
    align-items: center;
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .month-picker__year-btn {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    color: var(--text-normal);
    cursor: pointer;
    height: 28px;
    width: 28px;
  }

  .month-picker__year-input {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    color: var(--text-normal);
    flex: 1;
    height: 28px;
    padding: 0 6px;
    text-align: center;
  }

  .month-picker__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .month-picker__month {
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    color: var(--text-normal);
    cursor: pointer;
    font-size: 0.85em;
    padding: 6px 0;
    text-transform: capitalize;
  }

  .month-picker__month.is-current {
    border-color: var(--interactive-accent);
    color: var(--interactive-accent);
    font-weight: 600;
  }
</style>
