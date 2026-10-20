export type Align = '' | 'l' | 'c' | 'r';

export interface TableData {
	header: string[];
	aligns: Align[];
	rows: string[][];
}

function splitRow(line: string): string[] {
	let s = line.trim();
	if (s.startsWith('|')) s = s.slice(1);
	if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
	const cells: string[] = [];
	let cur = '';
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === '\\' && s[i + 1] === '|') {
			cur += '|';
			i++;
		} else if (c === '|') {
			cells.push(cur.trim());
			cur = '';
		} else {
			cur += c;
		}
	}
	cells.push(cur.trim());
	return cells;
}

const sepRegex = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

export function parseTable(text: string): TableData | null {
	const lines = text.split(/\r?\n/);
	if (lines.length < 2 || !sepRegex.test(lines[1])) return null;

	const header = splitRow(lines[0]);
	const n = header.length;
	const sep = splitRow(lines[1]);

	const aligns: Align[] = [];
	for (let i = 0; i < n; i++) {
		const s = sep[i] || '';
		const l = s.startsWith(':');
		const r = s.endsWith(':');
		aligns.push(l && r ? 'c' : r ? 'r' : l ? 'l' : '');
	}

	const rows = lines.slice(2).map(line => {
		const cells = splitRow(line);
		return Array.from({ length: n }, (_, i) => cells[i] || '');
	});

	return { header, aligns, rows };
}

export function serializeTable(data: TableData): string {
	const n = data.header.length;
	const clean = (s: string) => (s || '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
	const all = [data.header, ...data.rows].map(r =>
		Array.from({ length: n }, (_, i) => clean(r[i]))
	);

	const widths: number[] = [];
	for (let i = 0; i < n; i++) {
		widths.push(Math.max(3, ...all.map(r => r[i].length)));
	}

	const pad = (s: string, w: number, a: Align) => {
		const diff = w - s.length;
		if (a === 'r') return ' '.repeat(diff) + s;
		if (a === 'c') {
			const left = Math.floor(diff / 2);
			return ' '.repeat(left) + s + ' '.repeat(diff - left);
		}
		return s + ' '.repeat(diff);
	};

	const sepCell = (w: number, a: Align) => {
		if (a === 'c') return ':' + '-'.repeat(w - 2) + ':';
		if (a === 'r') return '-'.repeat(w - 1) + ':';
		if (a === 'l') return ':' + '-'.repeat(w - 1);
		return '-'.repeat(w);
	};

	const line = (cells: string[]) => '| ' + cells.join(' | ') + ' |';

	const out = [
		line(all[0].map((c, i) => pad(c, widths[i], data.aligns[i]))),
		line(widths.map((w, i) => sepCell(w, data.aligns[i]))),
		...all.slice(1).map(r => line(r.map((c, i) => pad(c, widths[i], data.aligns[i])))),
	];
	return out.join('\n');
}