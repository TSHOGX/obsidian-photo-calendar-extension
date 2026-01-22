<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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

  $: today = getToday();
  $: sources = getSources();

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
  });

  onMount(() => {
    updatePhotoBackgrounds();
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

  async function updatePhotoBackgrounds() {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!containerEl) return;

    containerEl.style.setProperty(
      "--photo-calendar-note-bg",
      plugin.settings.noteBackgroundColor
    );

    if (!plugin.settings.showPhotos) {
      const dayElements = containerEl.querySelectorAll(".day");
      dayElements.forEach((el: HTMLElement) => {
        el.style.backgroundImage = "";
        el.style.backgroundSize = "";
        el.style.backgroundPosition = "";
        el.style.backgroundRepeat = "";
        el.style.color = "";
        el.style.textShadow = "";
      });
      return;
    }

    const dailyNotes = getAllDailyNotes();
    Object.values(dailyNotes).forEach(async (file) => {
      const photo = await plugin.photoService.getPhotoForDate(file.path);
      if (photo) {
        const date = moment(file.basename, "YYYY-MM-DD");
        const dayElements = containerEl.querySelectorAll(".day");

        dayElements.forEach((el: HTMLElement) => {
          const dayText = el.textContent?.trim();
          if (dayText === date.format("D")) {
            const isCurrentMonth = !el.classList.contains("adjacent-month");
            const isRightMonth = date.month() === displayedMonth.month();

            if (isCurrentMonth && isRightMonth) {
              el.style.backgroundImage = `url('${photo}')`;
              el.style.backgroundSize = plugin.settings.photoFillMode;
              el.style.backgroundPosition = "center";
              el.style.backgroundRepeat = "no-repeat";
              el.style.color = "white";
              el.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.75), 0 2px 8px rgba(0, 0, 0, 0.45)";
            }
          }
        });
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
</div>

<style>
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
</style>
