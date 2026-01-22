<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import type PhotoCalendarPlugin from "./main";
  import type { Moment } from "moment";
  import {
    Calendar as CalendarBase,
    configureGlobalMomentLocale,
  } from "obsidian-calendar-ui";
  import { getDailyNote, getAllDailyNotes } from "obsidian-daily-notes-interface";
  import { createPhotoSource } from "./photoSource";
  import { createWordCountSource } from "./wordCountSource";

  export let plugin: PhotoCalendarPlugin;
  export let onDateClick: (date: Moment, isNewNote: boolean) => void;
  export let onDateHover: (date: Moment, targetEl: HTMLElement) => void;
  export let onWeekClick: (date: Moment, isMetaPressed: boolean) => Promise<boolean>;
  export let refreshTrigger: number = 0;

  const moment = (window as any).moment;
  let today: Moment;
  let displayedMonth: Moment = moment().startOf("month");
  let containerEl: HTMLDivElement | null = null;
  let showMonthPicker = false;
  let pickerYear = displayedMonth.year();
  let pickerTop = 0;
  let pickerLeft = 0;
  let monthPickerEl: HTMLDivElement | null = null;
  let isPickerListenersAttached = false;
  let containerClickHandler: ((event: MouseEvent) => void) | null = null;
  let monthNames: string[] = moment.monthsShort();

  $: today = getToday();
  $: sources = getSources();
  $: monthNames = today?.localeData?.()?.monthsShort?.() ?? moment.monthsShort();

  function getToday() {
    const { weekStart } = plugin.settings;
    configureGlobalMomentLocale("", weekStart);
    return moment();
  }

  function getSources() {
    if (plugin.settings.showPhotos) {
      return [createPhotoSource(plugin)];
    } else {
      return [createWordCountSource(plugin)];
    }
  }

  function handleClickDay(date: Moment, isMetaPressed: boolean) {
    const dailyNote = getDailyNote(date, getAllDailyNotes());
    onDateClick(date, !dailyNote);
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
  let lastDay = moment().date();
  let heartbeat = setInterval(() => {
    const now = moment();
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
    updatePhotoBackgrounds();
    containerClickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !containerEl) return;
      const titleEl = target.closest(".nav .title") as HTMLElement | null;
      if (!titleEl || !containerEl.contains(titleEl)) return;
      event.preventDefault();
      event.stopPropagation();
      // Prevent the calendar's default reset handler.
      (event as any).stopImmediatePropagation?.();
      openMonthPicker(titleEl);
    };
    containerEl?.addEventListener("click", containerClickHandler, true);
    window.addEventListener("resize", updatePickerPosition);
  });

  $: if (displayedMonth) {
    updatePhotoBackgrounds();
  }

  $: if (plugin.settings.showPhotos !== undefined) {
    updatePhotoBackgrounds();
  }

  $: if (refreshTrigger) {
    sources = getSources();
    updatePhotoBackgrounds();
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
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!containerEl) return;

    containerEl.style.setProperty(
      "--photo-calendar-note-bg",
      plugin.settings.noteBackgroundColor
    );

    const dayElements = Array.from(
      containerEl.querySelectorAll(".day")
    ) as HTMLElement[];

    dayElements.forEach((el: HTMLElement) => {
      el.style.backgroundImage = "";
      el.style.backgroundSize = "";
      el.style.backgroundPosition = "";
      el.style.backgroundRepeat = "";
      el.style.color = "";
      el.style.textShadow = "";
    });

    if (!plugin.settings.showPhotos) {
      return;
    }

    const locale = moment().locale();
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
    Object.values(dailyNotes).forEach(async (file) => {
      const photo = await plugin.photoService.getPhotoForDate(file.path);
      if (photo) {
        const date = moment(file.basename, "YYYY-MM-DD");
        const el = dateToElement.get(date.format("YYYY-MM-DD"));

        if (el) {
          el.style.backgroundImage = `url('${photo}')`;
          el.style.backgroundSize = plugin.settings.photoFillMode;
          el.style.backgroundPosition = "center";
          el.style.backgroundRepeat = "no-repeat";
          if (!el.classList.contains("adjacent-month")) {
            el.style.color = "white";
            el.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(0, 0, 0, 0.45)";
          }
        }
      }
    });
  }
</script>

<div
  class="photo-calendar"
  class:photo-calendar--photo-mode={plugin.settings.showPhotos}
  class:photo-calendar--weeknums={plugin.settings.showWeekNums}
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
  showWeekNums={plugin.settings.showWeekNums}
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
