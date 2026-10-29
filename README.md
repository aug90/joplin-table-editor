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
- [Formulas](#formulas)
- [Currency format](#currency-format)


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
- **Formulas** that recalculate as you type (`=B2*C2`, `=SUM(D2:D5)`, ...), with a one-tap **Σ** button for totals
- **Currency format** for a whole column (`1.234,50 €`), also applied to formula results
- Column letters and row numbers shown in the grid for cell references

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
| **Σ** | Writes a `SUM` formula summing the numeric cells above (or to the left of) the selected cell |
| **€** | Formats the selected cell's column as currency; tap again to remove it |
| **Formule → valori** | Removes all formulas and keeps the calculated values |

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
| **Tab** | Next cell (skips the row and column buttons) |
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
- **Formulas:** results are stored in the cells and the formulas in a hidden Markdown comment below the table (see [Formulas](#formulas)). The table is still plain Markdown.

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
- While a table contains formulas, sorting, dragging and deleting rows or columns are disabled (use **Formule → valori** to remove the formulas first).
- Currency formatting supports only the euro and the Italian number format.

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

## Formulas

Cells can contain formulas that update automatically when the numbers they depend on change. Type `=` followed by the formula, as in a spreadsheet. The grid shows the column letters above the columns and the row numbers on the left; the header is row 1.

| Example | Result |
|---------|--------|
| `=B2*C2` | Product of two cells |
| `=(B2+C2)*D2` | Parentheses are supported |
| `=SUM(D2:D5)` | Sum of a range |
| `=ROUND(AVERAGE(B2:B9);1)` | Functions can be combined |

The **Σ** button writes a `SUM` for you: with the cursor in an empty cell, it sums the numeric cells above it (or, if there are none, the ones to its left).

### Operators and functions

- Operators: `+` `-` `*` `/` `^` and parentheses.
- Functions (English or Italian names, case-insensitive): `SUM`/`SOMMA`, `AVERAGE`/`MEDIA`, `MIN`, `MAX`, `COUNT`/`CONTA`, `ABS`, `ROUND`/`ARROTONDA`.
- References: a single cell (`B2`) or a range (`B2:B9`, `B2:D2`, `B2:D9`). A formula can use the result of another formula.

### Rules

- In formulas, write decimals with a dot (`=B2*1.22`) and separate arguments with `;` (a comma also works). In cells you can write numbers the Italian way (`12,5`); results are shown with a comma.
- A value like `30%` is read as `30`, not `0.3`.
- Empty and text cells are ignored by functions such as `SUM` and `AVERAGE`; in a direct operation they count as 0.

### Errors

| Error | Cause |
|-------|-------|
| `#DIV/0!` | Division by zero, or average of a range with no numbers |
| `#CIRC!` | Circular reference |
| `#RIF!` | Invalid reference |
| `#NOME?` | Unknown function name |
| `#VALORE!` | A range used where a single number was expected |
| `#ERRORE!` | Malformed formula |

### How formulas are stored

The note always contains the **calculated result**, so it reads correctly without the plugin. The formulas themselves are kept in a hidden Markdown comment on the line below the table, separated by a blank line:

```markdown
[//]: # (tf:...)
```

This is a standard Markdown link reference definition: it is not rendered, and it is not HTML. If you change a result by hand in the note, the plugin notices the mismatch the next time you open the table and discards that formula instead of overwriting your value. If the table is copied to another note, the results come along but the formulas do not.

### Limitations

- While a table contains formulas, sorting, dragging and deleting rows or columns are disabled (a message explains why), because references would end up pointing to the wrong cells. The **Formule → valori** button removes the formulas and keeps the results, which unlocks these operations.
- **+ Riga** adds the new row at the bottom, below any totals row: edit the range of the formula to include it.
- No conditional functions (`IF`), no text or date functions, no references to other tables.

## Currency format

The **€** button formats the whole column of the selected cell (header excluded) as currency, Italian style: `1.234,50 €`, always with two decimals, negative numbers as `-1.234,50 €`. The column is also aligned to the right. Tap the button again to go back to plain numbers.

- A column counts as "currency" if it contains at least one amount ending with `€`; the format is stored in the cells themselves.
- Numbers you type in a currency column (`12,5` or `12.5`) are formatted when you leave the cell, and formula results in that column are shown as currency.
- Formulas, sorting and **Σ** understand these amounts, so `=SUM(B2:B5)` works on cells like `1.234,50 €`.
- Only the euro is supported, and amounts must use the Italian format (comma for decimals, dot for thousands).

