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
		data.formulas = data.formulas || {};
		const save = () => { input.value = JSON.stringify(data); };

		const ALIGN_ORDER = ['', 'l', 'c', 'r'];
		const ALIGN_LABEL = { '': 'A', l: '⇤', c: '↔', r: '⇥' };
		const FORMULA_LOCK = 'Con le formule presenti non si può ordinare, spostare o eliminare righe e colonne: tocca prima "Formule → valori".';
		const ERR = () => new Error('#ERRORE!');

		let lastCell = null;
		let measurer = null;
		let linkInput = null;
		let linkPanel = null;
		let linkTarget = null;
		let sortState = { col: -1, dir: 1 };

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

		// ---------- spostamento tra celle ----------
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

		// ---------- ordinamento ----------
		function toNum(s) {
			let t = s.replace(/[\s\u00a0]/g, '').replace(/€/g, '').replace(/%$/, '');
			if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
			else if (s.indexOf('€') >= 0 && /^[-+]?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
			return /^[-+]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
		}	
		function cmp(x, y) {
			const nx = toNum(x);
			const ny = toNum(y);
			if (nx !== null && ny !== null) return nx - ny;
			return x.localeCompare(y, 'it', { numeric: true, sensitivity: 'base' });
		}

		function sortBy(c) {
			if (hasFormulas()) {
				showNotice(FORMULA_LOCK);
				return;
			}
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

		// ---------- formule ----------
		function colToNum(s) {
			let n = 0;
			for (let k = 0; k < s.length; k++) n = n * 26 + (s.charCodeAt(k) - 64);
			return n - 1;
		}

		function numToCol(n) {
			let s = '';
			n++;
			while (n > 0) {
				const m = (n - 1) % 26;
				s = String.fromCharCode(65 + m) + s;
				n = Math.floor((n - 1) / 26);
			}
			return s;
		}

		function toAddr(r, c) { return numToCol(c) + (r + 2); }

		function parseAddr(a) {
			const m = /^([A-Z]+)(\d+)$/.exec(a);
			if (!m) return null;
			return { c: colToNum(m[1]), r: parseInt(m[2], 10) - 2 };
		}

		function rawCell(r, c) {
			if (r === -1) return data.header[c];
			return data.rows[r] ? data.rows[r][c] : undefined;
		}

		function hasFormulas() { return Object.keys(data.formulas).length > 0; }

		function showNotice(msg) {
			const n = grid.querySelector('.notice');
			if (n) {
				n.textContent = msg;
				n.classList.add('open');
			}
		}

		function sc(v) {
			if (Array.isArray(v)) throw new Error('#VALORE!');
			return v === null || v === undefined ? 0 : v;
		}

		function tokenize(src) {
			const t = [];
			let i = 0;
			while (i < src.length) {
				const ch = src[i];
				if (/\s/.test(ch)) { i++; continue; }
				const rest = src.slice(i);
				let m = /^\d+(\.\d+)?|^\.\d+/.exec(rest);
				if (m) { t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
				m = /^[A-Za-z]+\d+/.exec(rest);
				if (m) { t.push({ k: 'ref', v: m[0].toUpperCase() }); i += m[0].length; continue; }
				m = /^[A-Za-z]+/.exec(rest);
				if (m) { t.push({ k: 'fn', v: m[0].toUpperCase() }); i += m[0].length; continue; }
				if ('+-*/^():;,'.indexOf(ch) >= 0) { t.push({ k: ch }); i++; continue; }
				throw ERR();
			}
			return t;
		}

		function callFn(name, args) {
			const flat = [];
			args.forEach(a => {
				if (Array.isArray(a)) a.forEach(x => flat.push(x));
				else flat.push(a);
			});
			const nums = flat.filter(x => typeof x === 'number');
			const sum = nums.reduce((s, x) => s + x, 0);
			switch (name) {
				case 'SUM': case 'SOMMA': return sum;
				case 'AVERAGE': case 'MEDIA':
					if (!nums.length) throw new Error('#DIV/0!');
					return sum / nums.length;
				case 'MIN': return nums.length ? Math.min.apply(null, nums) : 0;
				case 'MAX': return nums.length ? Math.max.apply(null, nums) : 0;
				case 'COUNT': case 'CONTA': return nums.length;
				case 'ABS': return Math.abs(sc(args[0]));
				case 'ROUND': case 'ARROTONDA': {
					const f = Math.pow(10, args.length > 1 ? sc(args[1]) : 0);
					return Math.round(sc(args[0]) * f) / f;
				}
				default: throw new Error('#NOME?');
			}
		}

		function evalExpr(src, memo, stack) {
			const t = tokenize(src);
			let p = 0;
			const peek = () => (t[p] ? t[p].k : null);

			function expr() {
				let v = term();
				while (peek() === '+' || peek() === '-') {
					const o = t[p++].k;
					const w = term();
					v = o === '+' ? sc(v) + sc(w) : sc(v) - sc(w);
				}
				return v;
			}

			function term() {
				let v = factor();
				while (peek() === '*' || peek() === '/') {
					const o = t[p++].k;
					const w = factor();
					if (o === '*') {
						v = sc(v) * sc(w);
					} else {
						const d = sc(w);
						if (d === 0) throw new Error('#DIV/0!');
						v = sc(v) / d;
					}
				}
				return v;
			}

			function factor() {
				if (peek() === '-') { p++; return -sc(factor()); }
				if (peek() === '+') { p++; return factor(); }
				const b = atom();
				if (peek() === '^') { p++; return Math.pow(sc(b), sc(factor())); }
				return b;
			}

			function atom() {
				const k = t[p];
				if (!k) throw ERR();
				if (k.k === 'n') { p++; return k.v; }
				if (k.k === '(') {
					p++;
					const v = expr();
					if (peek() !== ')') throw ERR();
					p++;
					return v;
				}
				if (k.k === 'ref') {
					p++;
					const a = parseAddr(k.v);
					if (!a || a.r < -1) throw new Error('#RIF!');
					if (peek() === ':') {
						p++;
						const k2 = t[p++];
						const b = k2 && k2.k === 'ref' ? parseAddr(k2.v) : null;
						if (!b || b.r < -1) throw new Error('#RIF!');
						const out = [];
						for (let rr = Math.min(a.r, b.r); rr <= Math.max(a.r, b.r); rr++) {
							for (let cc = Math.min(a.c, b.c); cc <= Math.max(a.c, b.c); cc++) {
								out.push(calcCell(rr, cc, memo, stack));
							}
						}
						return out;
					}
					return calcCell(a.r, a.c, memo, stack);
				}
				if (k.k === 'fn') {
					p++;
					if (peek() !== '(') throw ERR();
					p++;
					const args = [];
					if (peek() !== ')') {
						args.push(expr());
						while (peek() === ';' || peek() === ',') {
							p++;
							args.push(expr());
						}
					}
					if (peek() !== ')') throw ERR();
					p++;
					return callFn(k.v, args);
				}
				throw ERR();
			}

			const res = expr();
			if (p < t.length) throw ERR();
			return res;
		}

		function calcCell(r, c, memo, stack) {
			const key = toAddr(r, c);
			if (key in memo) return memo[key];
			const f = data.formulas[key];
			if (f === undefined) {
				const raw = rawCell(r, c);
				memo[key] = raw === undefined ? null : toNum(String(raw).trim());
				return memo[key];
			}
			if (stack[key]) throw new Error('#CIRC!');
			stack[key] = true;
			try {
				memo[key] = evalExpr(f.slice(1), memo, stack);
			} finally {
				delete stack[key];
			}
			return memo[key];
		}

		function numOf(v) {
	if (Array.isArray(v)) throw new Error('#VALORE!');
	if (v === null || v === undefined) v = 0;
	if (typeof v !== 'number' || !isFinite(v)) throw new Error('#NUM!');
	return v;
}

		function fmtNum(v) {
			return String(Math.round(numOf(v) * 1e6) / 1e6).replace('.', ',');
		}

		function fmtCurrency(n) {
			const parts = Math.abs(n).toFixed(2).split('.');
			const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
			return (n < 0 ? '-' : '') + int + ',' + parts[1] + ' €';
		}

		function fmtCur(v) {
			return fmtCurrency(numOf(v));
		}

		function recalc() {
			const memo = {};
			const curCols = {};
			for (let cc = 0; cc < data.header.length; cc++) curCols[cc] = isCurrencyCol(cc);
			Object.keys(data.formulas).forEach(key => {
				const a = parseAddr(key);
				if (!a || a.r < -1 || a.c < 0 || a.c >= data.header.length || (a.r >= 0 && !data.rows[a.r])) {
					delete data.formulas[key];
					return;
				}
				let out;
				try {
					const val = calcCell(a.r, a.c, memo, {});
					out = curCols[a.c] && a.r >= 0 ? fmtCur(val) : fmtNum(val);
				} catch (e) {
					out = e && e.message && e.message.charAt(0) === '#' ? e.message : '#ERRORE!';
				}
				if (a.r === -1) data.header[a.c] = out;
				else data.rows[a.r][a.c] = out;
			});
		}

		function writeCell(r, c, text) {
			const addr = toAddr(r, c);
			if (text.trim().charAt(0) === '=') {
				data.formulas[addr] = text.trim();
			} else {
				delete data.formulas[addr];
				if (r === -1) data.header[c] = text;
				else data.rows[r][c] = text;
			}
		}

		function refreshInputs() {
			grid.querySelectorAll('input[data-c]').forEach(i => {
				const r = parseInt(i.dataset.r, 10);
				const c = parseInt(i.dataset.c, 10);
				const has = data.formulas[toAddr(r, c)] !== undefined;
				i.classList.toggle('has-formula', has);
				if (has && i !== document.activeElement) {
					const v = rawCell(r, c);
					i.value = v === undefined ? '' : v;
				}
			});
			fitColumns();
		}

		function setCell(r, c, text) {
			writeCell(r, c, text);
			recalc();
			save();
			refreshInputs();
		}

		function insertSum() {
			const t = lastCell;
			if (!t || !t.isConnected) return;
			const r = parseInt(t.dataset.r, 10);
			const c = parseInt(t.dataset.c, 10);
			if (r < 0) return;
			const isNum = (rr, cc) => rr >= 0 && cc >= 0 && toNum(String(rawCell(rr, cc) || '').trim()) !== null;
			let f = '=SUM(';
			let s = r - 1;
			while (isNum(s, c)) s--;
			if (s < r - 1) {
				f += toAddr(s + 1, c) + ':' + toAddr(r - 1, c) + ')';
			} else {
				let k = c - 1;
				while (isNum(r, k)) k--;
				f += k < c - 1 ? toAddr(r, k + 1) + ':' + toAddr(r, c - 1) + ')' : ')';
			}
			t.value = f;
			setCell(r, c, f);
			t.focus();
		}

		function isCurrencyCol(c) {
			return data.rows.some(row => {
				const s = String(row[c] || '').trim();
				return /€$/.test(s) && toNum(s) !== null;
			});
		}

		function toggleCurrency() {
			const t = lastCell;
			if (!t || !t.isConnected) return;
			const r = parseInt(t.dataset.r, 10);
			const c = parseInt(t.dataset.c, 10);
			const on = !isCurrencyCol(c);
			data.rows.forEach(row => {
				const n = toNum(String(row[c] || '').trim());
				if (n === null) return;
				row[c] = on ? fmtCurrency(n) : String(Math.round(n * 1e6) / 1e6).replace('.', ',');
			});
			if (on) data.aligns[c] = 'r';
			recalc();
			save();
			render();
			focusCell(r, c);
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
					writeCell(tr, c + j, cleanCell(val));
				});
			});
			sortState = { col: -1, dir: 1 };
			recalc();
			save();
			render();
			focusCell(r, c);
		}

		// ---------- celle ----------
		function cellInput(value, r, c) {
			const i = el('input', { type: 'text', value: value });
			i.dataset.r = r;
			i.dataset.c = c;
			if (data.formulas[toAddr(r, c)] !== undefined) i.classList.add('has-formula');
			i.setAttribute('enterkeyhint', 'next');

			i.addEventListener('input', () => { setCell(r, c, i.value); });

			i.addEventListener('focus', () => {
				lastCell = i;
				const f = data.formulas[toAddr(r, c)];
				if (f !== undefined) i.value = f;
			});

			i.addEventListener('blur', () => {
				i._s = i.selectionStart;
				i._e = i.selectionEnd;
				const addr = toAddr(r, c);
				if (data.formulas[addr] !== undefined) {
					const v = rawCell(r, c);
					i.value = v === undefined ? '' : v;
					fitColumns();
				} else if (r >= 0 && isCurrencyCol(c)) {
					const n = toNum(i.value.trim());
					if (n !== null) {
						const f = fmtCurrency(n);
						if (i.value !== f) {
							i.value = f;
							setCell(r, c, f);
						}
					}
				}
			});

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
			if (hasFormulas()) {
				showNotice(FORMULA_LOCK);
				return;
			}
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
			const h = el('button', { type: 'button', textContent: '⠿', className: 'handle', title: 'Trascina', tabIndex: -1 });
			h.addEventListener('pointerdown', e => startDrag(e, kind, index));
			return h;
		}

		// ---------- disegno ----------
		function render() {
			grid.innerHTML = '';
			lastCell = null;
			linkTarget = null;
			const n = data.header.length;

			// pulsanti barra strumenti
			const linkBtn = el('button', { type: 'button', textContent: '🔗 Link', title: 'Inserisci link' });
			linkBtn.addEventListener('mousedown', e => e.preventDefault());
			linkBtn.addEventListener('click', openLink);

			const brBtn = el('button', { type: 'button', textContent: '↵ br', title: 'A capo nella cella (inserisce <br>)' });
			brBtn.addEventListener('mousedown', e => e.preventDefault());
			brBtn.addEventListener('click', () => insertBr(lastCell));

			const sumBtn = el('button', { type: 'button', textContent: 'Σ', title: 'Somma le celle numeriche sopra (o a sinistra)' });
			sumBtn.addEventListener('mousedown', e => e.preventDefault());
			sumBtn.addEventListener('click', insertSum);

			const unF = el('button', { type: 'button', textContent: 'Formule → valori', title: 'Toglie le formule e lascia i risultati' });
			unF.addEventListener('click', () => {
				data.formulas = {};
				save();
				render();
			});

			const curBtn = el('button', { type: 'button', textContent: '€', title: 'Formatta la colonna come valuta (tocca di nuovo per toglierla)' });
			curBtn.addEventListener('mousedown', e => e.preventDefault());
			curBtn.addEventListener('click', toggleCurrency);

			const toolbar = el('div', { className: 'toolbar' }, [
				fmtButton('B', '**', 'Grassetto', 'fmt-b'),
				fmtButton('I', '*', 'Corsivo', 'fmt-i'),
				fmtButton('S', '~~', 'Barrato', 'fmt-s'),
				fmtButton('</>', '`', 'Codice', 'fmt-c'),
				brBtn,
				el('span', { className: 'sep' }),
				linkBtn,
				sumBtn,
				curBtn,
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

			// riga comandi colonne: etichetta, trascina, ordina, allineamento, elimina
			const ctrl = el('tr', { className: 'ctrl' });
			ctrl.appendChild(el('td'));
			for (let c = 0; c < n; c++) {
				const sortLabel = sortState.col === c ? (sortState.dir === 1 ? '▲' : '▼') : '↕';
				const sortBtn = el('button', { type: 'button', textContent: sortLabel, title: 'Ordina la colonna (tocca di nuovo per invertire)', tabIndex: -1 });
				sortBtn.addEventListener('click', () => sortBy(c));

				const al = el('button', {
					type: 'button',
					textContent: ALIGN_LABEL[data.aligns[c]],
					className: 'align-btn',
					title: 'Allineamento: A auto, ⇤ sinistra, ↔ centro, ⇥ destra',
					tabIndex: -1,
				});
				al.addEventListener('click', () => {
					const k = (ALIGN_ORDER.indexOf(data.aligns[c]) + 1) % ALIGN_ORDER.length;
					data.aligns[c] = ALIGN_ORDER[k];
					save();
					render();
				});

				const del = el('button', { type: 'button', textContent: '✕', className: 'danger', title: 'Elimina colonna', tabIndex: -1 });
				del.addEventListener('click', () => {
					if (hasFormulas()) {
						showNotice(FORMULA_LOCK);
						return;
					}
					if (data.header.length <= 1) return;
					data.header.splice(c, 1);
					data.aligns.splice(c, 1);
					data.rows.forEach(r => r.splice(c, 1));
					sortState = { col: -1, dir: 1 };
					save();
					render();
				});

				const td = el('td', {}, [
					el('div', { className: 'addr', textContent: numToCol(c) }),
					el('div', { className: 'cell-ctrl' }, [makeHandle('col', c), sortBtn, al, del]),
				]);
				td.dataset.col = c;
				ctrl.appendChild(td);
			}
			table.appendChild(ctrl);

			// intestazione (riga 1)
			const head = el('tr', { className: 'head' });
			head.appendChild(el('td', { className: 'addr', textContent: '1' }));
			for (let c = 0; c < n; c++) {
				const td = el('td', {}, [cellInput(data.header[c], -1, c)]);
				td.dataset.col = c;
				head.appendChild(td);
			}
			table.appendChild(head);

			// righe (dalla riga 2)
			data.rows.forEach((row, r) => {
				const tr = el('tr');
				tr.dataset.row = r;

				const del = el('button', { type: 'button', textContent: '✕', className: 'danger', title: 'Elimina riga', tabIndex: -1 });
				del.addEventListener('click', () => {
					if (hasFormulas()) {
						showNotice(FORMULA_LOCK);
						return;
					}
					data.rows.splice(r, 1);
					save();
					render();
				});

				tr.appendChild(el('td', {}, [
					el('div', { className: 'addr', textContent: String(r + 2) }),
					el('div', { className: 'cell-ctrl' }, [makeHandle('row', r), del]),
				]));
				for (let c = 0; c < n; c++) {
					const td = el('td', {}, [cellInput(row[c], r, c)]);
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
			grid.appendChild(el('div', { className: 'notice' }));
			grid.appendChild(el('div', { className: 'wrap' }, [table]));
			grid.appendChild(el('div', { className: 'actions' }, [addRow, addCol, unF]));
			fitColumns();
		}

		recalc();
		render();
	}

	init();
})();