# Table Editor for Joplin

A [Joplin](https://joplinapp.org) plugin that opens Markdown tables in an **editable, spreadsheet-style grid**, designed to work on mobile too. When you apply your changes, the table is written back to the note as **plain Markdown** (no HTML, apart from an optional `<br>` for line breaks inside a cell).

<!-- Add a screenshot here: ![Grid](docs/grid.png) -->

> **Note:** the plugin interface (button labels and menu entries) is currently in Italian. See [Interface language](#interface-language) for the English equivalents.

## Table of contents
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [How it works](#how-it-works)
- [Interface language](#interface-language)
- [Known limitations](#known-limitations)
- [Privacy](#privacy)
- [Development](#development)
- [Reporting issues](#reporting-issues)
- [License](#license)

## Features

- Detects the Markdown table under the cursor and opens it in a grid dialog
- Cell editing
- Add and remove rows and columns
- **Drag and drop** to reorder rows and columns, also by touch
- **Sort by column**, ascending or descending
- Per-column **alignment**: auto, left, center, right
- The table is **re-aligned automatically** when it is saved to the note
- **Paste from Excel or Google Sheets**: copied cells fill the grid
- Text formatting: bold, italic, strikethrough, code
- **Link** insertion
- Button to insert a **line break** inside a cell (`<br>`)
- **Arrow-key** navigation, and Enter moves to the cell below
- Column widths that fit the content
- Colors that follow the Joplin theme, where supported
- Works on **desktop** and **mobile**

## Requirements

- Joplin with plugin support. On **mobile**, plugin support is still experimental and depends on the version: update Joplin to the latest available release.
- The **Markdown** editor. The plugin does not work with the Rich Text editor.

## Installation

### From a `.jpl` file (recommended)
1. Go to the repository's [Releases](../../releases) page and download the `.jpl` file of the latest version.
2. **Desktop:** *Tools → Options → Plugins → gear icon → Install from file*, then choose the `.jpl`.
3. **Mobile:** *Configuration → Plugins*, enable plugin support if asked, then install from file.
4. Restart Joplin.

Plugins are not synchronized between devices: install the plugin on each one.

### Updating
Download the new `.jpl` from the Releases page and install it the same way: it replaces the previous version.

## Usage

1. Open a note in the Markdown editor and put the cursor **inside a table**.
2. Tap the plugin button in the editor toolbar (or *Tools → Modifica tabella* on desktop).
3. Edit the table in the grid.
4. Press **Applica** (Apply) to write the table back to the note, or **Annulla** (Cancel) to leave without changing anything.

Example table:

```markdown
| Exercise | Sets | Reps |
|----------|:----:|-----:|
| Squat    |  4   |    8 |
| Bench    |  4   |   10 |
```

### Grid controls

| Control | What it does |
|---------|--------------|
| **⠿** above a column or left of a row | Press and drag to move the column or row |
| **↕ / ▲ / ▼** above a column | Sorts the column; tap again to reverse the order |
| **A / ⇤ / ↔ / ⇥** above a column | Changes alignment: auto, left, center, right |
| **✕** above a column or left of a row | Deletes the column or row |
| **+ Riga / + Colonna** | Adds a row or a column at the end |
| **B / I / S / `</>`** | Bold, italic, strikethrough, code on the selected text |
| **↵ br** | Inserts `<br>` to break the line inside the cell |
| **🔗 Link** | Inserts a Markdown link |

### Formatting and links
- Select some text in a cell and tap **B**, **I**, **S** or **`</>`**: the text is wrapped in the Markdown symbols. Tapping the button again removes the formatting.
- With no text selected, the button inserts the symbols and leaves the cursor between them.
- For a link, select the text, tap **🔗 Link**, type the address and press **Inserisci** (Insert). The cell becomes `[text](address)`. With no selection, the address itself is used as the text.

### Paste from Excel or Google Sheets
Copy a range of cells in your spreadsheet, then paste it into a cell of the grid: the cells are filled starting from that cell, and the plugin adds rows and columns if needed. If you paste starting from the header, the first copied row becomes the header. If you copy a single cell, the text is inserted at the cursor position.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Moves to the cell below; in the last row it creates a new row |
| **Shift + Enter** | Inserts `<br>` (line break inside the cell) |
| **↑ / ↓** | Cell above / below (selects the cell text) |
| **← / →** | Cell to the left / right, when the cursor is at the start / end of the text |
| **Tab** | Next field |
| **Ctrl + V** | Paste; with cells copied from a spreadsheet it fills the grid |

On **desktop** you can assign a shortcut to the *Modifica tabella* command from *Tools → Options → Keyboard Shortcuts*.

## How it works

- **Plain Markdown:** the table is always saved in GFM format (`| a | b |` plus a separator row). A `<table>` is never generated.
- **Column alignment:** when saving, columns are padded with spaces so the source text looks tidy. The `:---`, `:---:` and `---:` markers in the separator row reflect the chosen alignment.
- **`|` characters:** a `|` inside a cell is escaped as `\|`.
- **Line breaks in cells:** Markdown tables have no multi-line cells. The plugin does not convert or alter `<br>` tags; the **↵ br** button simply inserts one.
- **Sorting:** if the values are numbers (including `12,5` or `30%`) the order is numeric; otherwise it is alphabetical, with "2" before "10". Empty cells always go last and the header stays in place. After editing a cell the table does not re-sort by itself.
- **Apply:** changes are written to the note only when you press **Applica**; the dialog is modal and does not update the note in real time.
- **Undo:** the editor's undo (Ctrl+Z) restores the previous table in a single step.

## Interface language

The plugin interface is currently in Italian. English equivalents:

| Shown in the plugin | Meaning |
|---------------------|---------|
| Modifica tabella | Edit table (toolbar button and *Tools* menu entry) |
| Applica | Apply |
| Annulla | Cancel |
| + Riga | + Row |
| + Colonna | + Column |
| Inserisci | Insert (link) |
| Nessuna tabella trovata sotto il cursore | No table found under the cursor |
| Il testo sotto il cursore non è una tabella Markdown valida | The text under the cursor is not a valid Markdown table |

## Known limitations

- Works with the Markdown editor only, not with Rich Text.
- Tables inside blockquotes (`> | a | b |`) or lists are not yet recognized correctly.
- A code block containing `|` characters, or a line of text containing `|` right next to the table with no blank line, can make detection fail.
- Dates in `dd/mm/yyyy` format are sorted as text, not chronologically.
- With emoji or very wide characters, the alignment of the source text can be slightly off.
- The grid does not scroll automatically while dragging: with very wide tables, move the view first.
- On mobile, appearance and some features depend on the Joplin version and its plugin support.

## Privacy

The plugin runs entirely locally: it makes no network connections, collects no data, and stores nothing outside your notes.

## Development

Requirements: [Node.js](https://nodejs.org) (LTS version).

```bash
git clone https://github.com/aug90/joplin-table-editor.git
cd joplin-table-editor
npm install
npm run dist
```

`npm run dist` builds the plugin and creates the `.jpl` file in the `publish` folder.

### Project structure

| File | Role |
|------|------|
| `src/index.ts` | Registers the command, button and menu item; opens the dialog and rewrites the table |
| `src/contentScript.ts` | Runs inside the editor (CodeMirror): finds the table under the cursor and replaces the text |
| `src/tableUtils.ts` | Reads (`parseTable`) and writes (`serializeTable`) Markdown tables |
| `src/webview.js` | Grid interface (cells, formatting, links, drag and drop, sorting, paste) |
| `src/webview.css` | Dialog styling |
| `src/manifest.json` | Plugin metadata for Joplin |
| `plugin.config.json` | Build configuration |

### Publishing a new version
1. Increase `version` in `src/manifest.json`.
2. Run `npm run dist`.
3. Commit and push.
4. Create a new Release on GitHub and attach the new `.jpl`.

## Reporting issues

Open an [issue](../../issues) and include:
- your system (Windows, Android, iOS...) and Joplin version;
- whether you use desktop or mobile;
- the steps to reproduce the problem and, if possible, the table that causes it.

## License

Released under the MIT License. See the [LICENSE](LICENSE) file.