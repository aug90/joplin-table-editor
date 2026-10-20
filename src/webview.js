(function () {
	function el(tag, props, children) {
		const e = document.createElement(tag);
		Object.assign(e, props || {});
		(children || []).forEach(c => e.appendChild(c));
		return e;
	}

	function init() {
		const input = document.getElementById('data');
		const grid = document.getElementById('grid');
		if (!input || !grid) {
			setTimeout(init, 50);
			return;
		}
		if (grid.dataset.ready) return;
		grid.dataset.ready = '1';

		const data = JSON.parse(input.value);
		const save = () => { input.value = JSON.stringify(data); };

		const ALIGN_ORDER = ['', 'l', 'c', 'r'];
		const ALIGN_LABEL = { '': 'A', l: '⇤', c: '↔', r: '⇥' };
		let lastCell = null;
		let measurer = null;
		let linkInput = null;
		let linkPanel = null;
		let linkTarget = null;

		// ---------- utilità ----------
		const isEnter = e => e.key === 'Enter' || e.keyCode === 13;
		const blockEvent = e => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		};

		function getSel(t) {
			const live = document.activeElement === t;
			return {
				s: live ? t.selectionStart : (t._s != null ? t._s : t.value.length),
				e: live ? t.selectionEnd : (t._e != null ? t._e : t.value.length),
			};
		}

		function setValue(t, nv, ns, ne) {
			t.value = nv;
			t.dispatchEvent(new Event('input'));
			t.focus();
			t.setSelectionRange(ns, ne);
		}

		// ---------- larghezza colonne in base al testo ----------
		function measure(text) {
			if (!measurer) {
				measurer = el('span', { className: 'measure' });
				document.body.appendChild(measurer);
			}
			measurer.textContent = text || '';
			return measurer.offsetWidth;
		}

		function fitColumns() {
			const n = data.header.length;
			for (let c = 0; c < n; c++) {
				const cells = grid.querySelectorAll('input[data-c="' + c + '"]');
				let w = 0;
				cells.forEach(i => { w = Math.max(w, measure(i.value)); });
				const px = Math.max(60, w + 30) + 'px';
				cells.forEach(i => { i.style.width = px; });
			}
		}

		// ---------- celle ----------
		function focusCell(r, c, mode) {
			const t = grid.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
			if (!t) return false;
			t.focus();
			if (mode === 'start') t.setSelectionRange(0, 0);
			else if (mode === 'end') t.setSelectionRange(t.value.length, t.value.length);
			else if (mode === 'all') t.select();
			return true;
		}

		function goDown(r, c) {
			if (r + 1 >= data.rows.length) {
				data.rows.push(new Array(data.header.length).fill(''));
				save();
				render();
			}
			focusCell(r + 1, c);
		}

	// ---------- incolla da Excel / Fogli ----------
	function parseTSV(text) {
		const rows = [];
		let row = [];
		let cur = '';
		let inQ = false;
		for (let k = 0; k < text.length; k++) {
			const ch = text[k];
			if (inQ) {
				if (ch === '"') {
					if (text[k + 1] === '"') { cur += '"'; k++; } else inQ = false;
				} else {
					cur += ch;
				}
			} else if (ch === '"' && cur === '') {
				inQ = true;
			} else if (ch === '\t') {
				row.push(cur);
				cur = '';
			} else if (ch === '\n' || ch === '\r') {
				if (ch === '\r' && text[k + 1] === '\n') k++;
				row.push(cur);
				rows.push(row);
				row = [];
				cur = '';
			} else {
				cur += ch;
			}
		}
		if (cur !== '' || row.length) {
			row.push(cur);
			rows.push(row);
		}
		return rows;
	}

	const cleanCell = s => s.replace(/\s*[\r\n]+\s*/g, ' ').trim();

	function pasteGrid(r, c, block) {
		const needCols = c + Math.max.apply(null, block.map(x => x.length));
		while (data.header.length < needCols) {
			data.header.push('');
			data.aligns.push('');
			data.rows.forEach(x => x.push(''));
		}
		const n = data.header.length;
		block.forEach((line, k) => {
			const tr = r + k;
			while (tr >= 0 && data.rows.length <= tr) data.rows.push(new Array(n).fill(''));
			line.forEach((val, j) => {
				if (tr === -1) data.header[c + j] = cleanCell(val);
				else data.rows[tr][c + j] = cleanCell(val);
			});
		});
		sortState = { col: -1, dir: 1 };
		save();
		render();
		focusCell(r, c);
	}

	// ---------- ordinamento ----------
	let sortState = { col: -1, dir: 1 };

	function toNum(s) {
		const t = s.replace(/\s/g, '').replace(/%$/, '').replace(',', '.');
		return /^[-+]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
	}

	function cmp(x, y) {
		const nx = toNum(x);
		const ny = toNum(y);
		if (nx !== null && ny !== null) return nx - ny;
		return x.localeCompare(y, 'it', { numeric: true, sensitivity: 'base' });
	}

	function sortBy(c) {
		const dir = sortState.col === c ? -sortState.dir : 1;
		sortState = { col: c, dir: dir };
		data.rows.sort((ra, rb) => {
			const x = (ra[c] || '').trim();
			const y = (rb[c] || '').trim();
			if (x === '' || y === '') return (x === '') - (y === '');
			return dir * cmp(x, y);
		});
		save();
		render();
	}

		function cellInput(value, r, c, onChange) {
			const i = el('input', { type: 'text', value: value });
			i.dataset.r = r;
			i.dataset.c = c;
			i.setAttribute('enterkeyhint', 'next');
			i.addEventListener('input', () => { onChange(i.value); save(); fitColumns(); });
			i.addEventListener('focus', () => { lastCell = i; });
			i.addEventListener('blur', () => { i._s = i.selectionStart; i._e = i.selectionEnd; });
			i.addEventListener('paste', e => {
				const text = (e.clipboardData || window.clipboardData).getData('text');
				if (!/[\t\n\r]/.test(text)) return;
				e.preventDefault();
				const block = parseTSV(text);
				if (!block.length) return;
				if (block.length === 1 && block[0].length === 1) {
					const s = i.selectionStart;
					const en = i.selectionEnd;
					const ins = cleanCell(block[0][0]);
					setValue(i, i.value.slice(0, s) + ins + i.value.slice(en), s + ins.length, s + ins.length);
				} else {
					pasteGrid(r, c, block);
				}
			});
			i.addEventListener('keydown', e => {
				if (isEnter(e)) {
					blockEvent(e);
					if (e.shiftKey) insertBr(i);
					else goDown(r, c);
					return;
				}
				let moved = false;
				if (e.key === 'ArrowDown') {
					moved = focusCell(r + 1, c, 'all');
				} else if (e.key === 'ArrowUp') {
					moved = focusCell(r - 1, c, 'all');
				} else if (e.key === 'ArrowLeft' && i.selectionStart === 0 && i.selectionEnd === 0) {
					moved = focusCell(r, c - 1, 'end');
				} else if (e.key === 'ArrowRight' && i.selectionStart === i.value.length && i.selectionEnd === i.value.length) {
					moved = focusCell(r, c + 1, 'start');
				}
				if (moved) e.preventDefault();
			});
			['keypress', 'keyup'].forEach(ev => {
				i.addEventListener(ev, e => { if (isEnter(e)) blockEvent(e); });
			});
			return i;
		}

		// ---------- formattazione testo ----------
		function format(mark) {
			const t = lastCell;
			if (!t || !t.isConnected) return;
			const sel0 = getSel(t);
			const s = sel0.s;
			const e = sel0.e;
			const v = t.value;
			const m = mark.length;
			const sel = v.slice(s, e);

			if (sel.length >= 2 * m && sel.startsWith(mark) && sel.endsWith(mark)) {
				const inner = sel.slice(m, sel.length - m);
				setValue(t, v.slice(0, s) + inner + v.slice(e), s, s + inner.length);
			} else if (s >= m && v.slice(s - m, s) === mark && v.slice(e, e + m) === mark) {
				setValue(t, v.slice(0, s - m) + sel + v.slice(e + m), s - m, s - m + sel.length);
			} else {
				setValue(t, v.slice(0, s) + mark + sel + mark + v.slice(e), s + m, e + m);
			}
		}

		function insertBr(t) {
			if (!t || !t.isConnected) return;
			const sel = getSel(t);
			const v = t.value;
			const ins = '<br>';
			setValue(t, v.slice(0, sel.e) + ins + v.slice(sel.e), sel.e + ins.length, sel.e + ins.length);
		}

		function fmtButton(label, mark, title, cls) {
			const b = el('button', { type: 'button', textContent: label, title: title, className: cls || '' });
			b.addEventListener('mousedown', e => e.preventDefault());
			b.addEventListener('click', () => format(mark));
			return b;
		}

		// ---------- link ----------
		function openLink() {
			const t = lastCell;
			if (!t || !t.isConnected) return;
			const sel = getSel(t);
			linkTarget = { t: t, s: sel.s, e: sel.e };
			linkInput.value = 'https://';
			linkPanel.classList.add('open');
			linkInput.focus();
		}

		function closeLink() {
			linkPanel.classList.remove('open');
			linkTarget = null;
		}

		function applyLink() {
			const url = linkInput.value.trim().replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
			if (!linkTarget || !url || url === 'https://') {
				closeLink();
				return;
			}
			const t = linkTarget.t;
			const s = linkTarget.s;
			const e = linkTarget.e;
			const v = t.value;
			const text = v.slice(s, e) || url;
			const md = '[' + text + '](' + url + ')';
			closeLink();
			setValue(t, v.slice(0, s) + md + v.slice(e), s + md.length, s + md.length);
		}

		// ---------- trascinamento righe/colonne ----------
		function startDrag(e, kind, index) {
			e.preventDefault();
			const handle = e.currentTarget;
			handle.setPointerCapture(e.pointerId);
			let target = index;
			const sel = kind === 'row' ? 'tr[data-row]' : 'tr.ctrl td[data-col]';

			const findTarget = (x, y) => {
				const items = Array.from(grid.querySelectorAll(sel));
				let best = index;
				items.forEach((it, i) => {
					const r = it.getBoundingClientRect();
					if (kind === 'row') {
						if (y >= r.top && y <= r.bottom) best = i;
					} else if (x >= r.left && x <= r.right) {
						best = i;
					}
				});
				if (items.length) {
					const first = items[0].getBoundingClientRect();
					const last = items[items.length - 1].getBoundingClientRect();
					if (kind === 'row') {
						if (y < first.top) best = 0;
						if (y > last.bottom) best = items.length - 1;
					} else {
						if (x < first.left) best = 0;
						if (x > last.right) best = items.length - 1;
					}
				}
				return best;
			};

			const mark = t => {
				grid.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
				if (kind === 'row') {
					const tr = grid.querySelector('tr[data-row="' + t + '"]');
					if (tr) tr.classList.add('drop');
				} else {
					grid.querySelectorAll('[data-col="' + t + '"]').forEach(x => x.classList.add('drop'));
				}
			};

			const move = ev => {
				target = findTarget(ev.clientX, ev.clientY);
				mark(target);
			};

			const end = () => {
				handle.removeEventListener('pointermove', move);
				handle.removeEventListener('pointerup', end);
				handle.removeEventListener('pointercancel', end);
				if (target !== index) {
					sortState = { col: -1, dir: 1 };
					if (kind === 'row') {
						const m = data.rows.splice(index, 1)[0];
						data.rows.splice(target, 0, m);
					} else {
						[data.header, data.aligns].forEach(a => {
							const m = a.splice(index, 1)[0];
							a.splice(target, 0, m);
						});
						data.rows.forEach(r => {
							const m = r.splice(index, 1)[0];
							r.splice(target, 0, m);
						});
					}
					save();
				}
				render();
			};

			handle.addEventListener('pointermove', move);
			handle.addEventListener('pointerup', end);
			handle.addEventListener('pointercancel', end);
			mark(index);
		}

		function makeHandle(kind, index) {
			const h = el('button', { type: 'button', textContent: '⠿', className: 'handle', title: 'Trascina', tabindex: -1 });
			h.addEventListener('pointerdown', e => startDrag(e, kind, index));
			return h;
		}

		// ---------- disegno ----------
		function render() {
			grid.innerHTML = '';
			lastCell = null;
			linkTarget = null;
			const n = data.header.length;

			// barra strumenti
			const linkBtn = el('button', { type: 'button', textContent: '🔗 Link', title: 'Inserisci link' });
			linkBtn.addEventListener('mousedown', e => e.preventDefault());
			linkBtn.addEventListener('click', openLink);

			const brBtn = el('button', { type: 'button', textContent: '↵ br', title: 'A capo nella cella (inserisce <br>)' });
			brBtn.addEventListener('mousedown', e => e.preventDefault());
			brBtn.addEventListener('click', () => insertBr(lastCell));

			const toolbar = el('div', { className: 'toolbar' }, [
				fmtButton('B', '**', 'Grassetto', 'fmt-b'),
				fmtButton('I', '*', 'Corsivo', 'fmt-i'),
				fmtButton('S', '~~', 'Barrato', 'fmt-s'),
				fmtButton('</>', '`', 'Codice', 'fmt-c'),
				brBtn,
				el('span', { className: 'sep' }),
				linkBtn,
			]);

			// pannello link
			linkInput = el('input', { type: 'text', placeholder: 'https://…', className: 'link-input' });
			linkInput.setAttribute('inputmode', 'url');
			linkInput.addEventListener('keydown', e => {
				if (isEnter(e)) {
					blockEvent(e);
					applyLink();
				} else if (e.key === 'Escape') {
					blockEvent(e);
					closeLink();
				}
			});
			['keypress', 'keyup'].forEach(ev => {
				linkInput.addEventListener(ev, e => { if (isEnter(e)) blockEvent(e); });
			});
			const linkOk = el('button', { type: 'button', textContent: 'Inserisci', className: 'primary' });
			linkOk.addEventListener('click', applyLink);
			const linkCancel = el('button', { type: 'button', textContent: 'Annulla' });
			linkCancel.addEventListener('click', closeLink);
			linkPanel = el('div', { className: 'linkbar' }, [linkInput, linkOk, linkCancel]);

			// tabella
			const table = el('table');

			const ctrl = el('tr', { className: 'ctrl' });
			ctrl.appendChild(el('td'));
			for (let c = 0; c < n; c++) {
				const sortLabel = sortState.col === c ? (sortState.dir === 1 ? '▲' : '▼') : '↕';
				const sortBtn = el('button', { type: 'button', textContent: sortLabel, title: 'Ordina la colonna (tocca di nuovo per invertire)' });
				sortBtn.addEventListener('click', () => sortBy(c));
				const al = el('button', {
					type: 'button',
					textContent: ALIGN_LABEL[data.aligns[c]],
					className: 'align-btn',
					title: 'Allineamento: A auto, ⇤ sinistra, ↔ centro, ⇥ destra',
				});
				al.addEventListener('click', () => {
					const k = (ALIGN_ORDER.indexOf(data.aligns[c]) + 1) % ALIGN_ORDER.length;
					data.aligns[c] = ALIGN_ORDER[k];
					save();
					render();
				});
				const del = el('button', { type: 'button', textContent: '✕', className: 'danger', title: 'Elimina colonna' });
				del.addEventListener('click', () => {
					if (data.header.length <= 1) return;
					data.header.splice(c, 1);
					data.aligns.splice(c, 1);
					data.rows.forEach(r => r.splice(c, 1));
					sortState = { col: -1, dir: 1 };
					save();
					render();
				});
				const td = el('td', {}, [el('div', { className: 'cell-ctrl' }, [makeHandle('col', c), sortBtn, al, del])]);
				td.dataset.col = c;
				ctrl.appendChild(td);
			}
			table.appendChild(ctrl);
			table.appendChild(ctrl);

			const head = el('tr', { className: 'head' });
			head.appendChild(el('td'));
			for (let c = 0; c < n; c++) {
				const td = el('td', {}, [cellInput(data.header[c], -1, c, v => { data.header[c] = v; })]);
				td.dataset.col = c;
				head.appendChild(td);
			}
			table.appendChild(head);

			data.rows.forEach((row, r) => {
				const tr = el('tr');
				tr.dataset.row = r;
				const del = el('button', { type: 'button', textContent: '✕', className: 'danger', title: 'Elimina riga', tabindex: -1 });
				del.addEventListener('click', () => {
					data.rows.splice(r, 1);
					save();
					render();
				});
				tr.appendChild(el('td', {}, [el('div', { className: 'cell-ctrl' }, [makeHandle('row', r), del])]));
				for (let c = 0; c < n; c++) {
					const td = el('td', {}, [cellInput(row[c], r, c, v => { row[c] = v; })]);
					td.dataset.col = c;
					tr.appendChild(td);
				}
				table.appendChild(tr);
			});

			const addRow = el('button', { type: 'button', textContent: '+ Riga' });
			addRow.addEventListener('click', () => {
				data.rows.push(new Array(n).fill(''));
				save();
				render();
			});
			const addCol = el('button', { type: 'button', textContent: '+ Colonna' });
			addCol.addEventListener('click', () => {
				data.header.push('');
				data.aligns.push('');
				data.rows.forEach(r => r.push(''));
				save();
				render();
			});

			grid.appendChild(toolbar);
			grid.appendChild(linkPanel);
			grid.appendChild(el('div', { className: 'wrap' }, [table]));
			grid.appendChild(el('div', { className: 'actions' }, [addRow, addCol]));
			fitColumns();
		}

		render();
	}

	init();
})();