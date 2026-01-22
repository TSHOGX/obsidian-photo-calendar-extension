# Photo Calendar

[English](#) | [中文](./README.zh.md)

A calendar plugin for Obsidian that displays photos from your daily notes as calendar backgrounds.

## Features

- **Photo Mode**: Display photos from daily note frontmatter as calendar cell backgrounds
- **Photo Mode Note Background**: Custom background color for dates with notes but no photos
- **Adjacent-Month Photos**: Show photos even for days outside the current month grid
- **Month Picker**: Click the calendar title to jump to any month and year
- **Photo Fill Mode**: Choose cover (crop) or contain (fit) for calendar photos
- **Word Count Dots**: Visual indicators showing note length (customizable words per dot) in standard mode
- **Weekly Notes**: Click week numbers to create or open weekly notes
- **Daily Notes Integration**: Click dates to open or create daily notes
- **Configurable**: Customize week start, photo sources, and display preferences

## Screenshots

**Plugin View**
![Plugin View](./screenshots/plugin-view.webp)

**Full View with Daily Note**
![Full View](./screenshots/full-view.webp)

**Month Picker**
![Month Picker](./screenshots/day-picker.webp)

**Settings**
![Settings](./screenshots/setting.webp)

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/photo-calendar/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run dev
```

## Usage

Add image references to your daily notes' frontmatter:

```yaml
---
image: "[[photo.jpg]]"
---
```

The plugin supports wikilinks, URLs, and relative paths. Configure which frontmatter fields to check in settings (default: `image`, `cover`, `banner`).

## Settings

- **Show Photos**: Toggle photo display mode
- **Photo Mode Note Background**: Background color for notes without photos (photo mode)
- **Reset Photo Mode Note Background**: Restore the default background color
- **Photo Fill Mode**: Cover (crop) or Contain (fit) photo display
- **Week Start**: Choose locale default, Sunday, or Monday
- **Show Week Numbers**: Display week numbers for weekly note navigation
- **Photo Frontmatter Fields**: Customize which fields to check for images
- **Words per Dot**: Configure how many words each dot represents
- **Confirm Before Creating**: Show confirmation before creating new notes

## Acknowledgments

This plugin combines functionality inspired by:
- [obsidian-calendar-plugin](https://github.com/liamcain/obsidian-calendar-plugin) - Calendar interface and daily notes integration
- [notebook-navigator](https://github.com/lizard-heart/notebook-navigator) - Photo display as calendar backgrounds

## License

MIT
