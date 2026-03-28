import { FU } from '../helpers/config.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';

const POSITIVE_EMOTIONS = new Set(['admiration', 'loyalty', 'affection']);

/**
 * @typedef BondNodeData
 * @property name
 * @property id
 * @property img
 * @property {'character'|'adversary'|'codex'} type
 * @property isPC
 */

/**
 * @typedef BondChartData
 * @property {BondNodeData[]} characters // TODO: Rename
 * @property bonds
 */

const RADIUS_SCALE = 0.65;
const MINIMUM_RADIUS = 0.35;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

export class FUBondChart {
	#container;
	#svg;
	#data;
	#bonds;
	#positions = new Map(); // id → {x, y}
	#focusId = null;
	#resizeObserver;
	#zoom = 1;
	#panOffset = { x: 0, y: 0 };
	#panStart = { x: 0, y: 0 };
	#isPanning = false;

	/**
	 * @param {HTMLElement}   container
	 * @param {BondChartData} data
	 */
	constructor(container, data) {
		this.#container = container;
		this.#svg = container.querySelector('.pfu-bond-chart__svg');
		this.#data = data;
		this.#bonds = data.bonds;
	}

	render() {
		const pcs = this.#data.characters.filter((c) => c.isPC);
		const randomPC = pcs[Math.floor(Math.random() * pcs.length)];
		this.#focusId = randomPC?.id ?? this.#data.characters[0]?.id;

		// Place instantly on first render, no transition
		this.#refocus(this.#focusId, true);
		this.#bindNodeClicks();
		this.#bindPanAndZoom();
		this.#bindVisibility();

		this.#resizeObserver = new ResizeObserver(() => {
			this.#refocus(this.#focusId, true);
		});
		this.#resizeObserver.observe(this.#container);
	}

	// ── Node click → re-focus ─────────────────────────────────────────
	#bindNodeClicks() {
		this.#container.querySelectorAll('.pfu-bond-chart__node').forEach((node) => {
			node.addEventListener('click', () => {
				const id = node.dataset.id;
				this.#focusId = id;
				this.resetTransform();
				this.#refocus(id);
			});
		});
	}

	#bindVisibility() {
		const tabPanel = this.#container.closest('.tab');
		if (!tabPanel) return;

		const observer = new MutationObserver(() => {
			const isVisible = !tabPanel.classList.contains('hidden') && tabPanel.style.display !== 'none';
			if (isVisible) {
				this.#refocus(this.#focusId, true);
			}
		});

		observer.observe(tabPanel, { attributes: true, attributeFilter: ['class', 'style'] });
		this.#resizeObserver = observer; // store to disconnect on destroy
	}

	#refocus(centerId, instant = false) {
		const { width, height } = this.#container.getBoundingClientRect();
		const cx = width / 2;
		const cy = height / 2;

		const dist = new Map([[centerId, 0]]);
		const adj = new Map(this.#data.characters.map((c) => [c.id, []]));
		this.#bonds.forEach((b) => {
			adj.get(b.source)?.push(b.target);
			adj.get(b.target)?.push(b.source);
		});

		const queue = [centerId];
		let qi = 0;
		while (qi < queue.length) {
			const current = queue[qi++];
			adj.get(current)?.forEach((neighbor) => {
				if (!dist.has(neighbor)) {
					dist.set(neighbor, dist.get(current) + 1);
					queue.push(neighbor);
				}
			});
		}
		this.#data.characters.forEach((c) => {
			if (!dist.has(c.id)) dist.set(c.id, 999);
		});

		const byDist = new Map();
		this.#data.characters.forEach((c) => {
			const d = dist.get(c.id);
			if (!byDist.has(d)) byDist.set(d, []);
			byDist.get(d).push(c);
		});

		const maxDist = Math.max(...[...dist.values()].filter((d) => d !== 999));
		const maxRadius = Math.min(width, height) * RADIUS_SCALE;
		const minR = Math.min(width, height) * MINIMUM_RADIUS;

		byDist.forEach((chars, d) => {
			chars.forEach((c, i) => {
				let x, y, opacity;

				if (d === 0) {
					const r = chars.length === 1 ? 0 : 48 + chars.length * 18;
					const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2;
					x = cx + r * Math.cos(angle);
					y = cy + r * Math.sin(angle);
					opacity = 1;
				} else if (d === 999) {
					const angle = (2 * Math.PI * i) / chars.length;
					x = cx + maxRadius * Math.cos(angle);
					y = cy + maxRadius * Math.sin(angle);
					opacity = 0.25;
				} else {
					const baseR = minR + ((d - 1) / (maxDist || 1)) * (maxRadius - minR);
					const nodeSize = 80;
					const r = Math.max(baseR, (chars.length * nodeSize) / (2 * Math.PI));
					const angleOffset = (d % 2) * (Math.PI / chars.length);
					const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2 + angleOffset;
					x = cx + r * Math.cos(angle);
					y = cy + r * Math.sin(angle);
					opacity = Math.max(0.35, 1 - d * 0.2);
				}

				this.#positions.set(c.id, { x, y });

				const node = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${c.id}"]`);
				if (!node) return;
				if (instant) {
					// Disable transition, set position, re-enable on next frame
					node.style.transition = 'none';
					node.style.left = `${x}px`;
					node.style.top = `${y}px`;
					node.style.opacity = opacity;
					// Force reflow then restore transition
					requestAnimationFrame(() => {
						node.style.transition = 'left 0.4s ease, top 0.4s ease, opacity 0.4s ease';
					});
				} else {
					node.style.left = `${x}px`;
					node.style.top = `${y}px`;
					node.style.opacity = opacity;
				}
			});
		});

		//setTimeout(() => this.#drawLines(), 420);

		// Before
		//setTimeout(() => this.#drawLines(), 420);

		// After — positions are already known, no need to wait
		this.#drawLines();
	}

	// ── Pan/Zoom  ───────────────────────────
	#bindPanAndZoom() {
		const el = this.#container;

		// Pan — mousedown to start
		el.addEventListener('mousedown', (e) => {
			if (e.button !== 0 || e.target.closest('.pfu-bond-chart__node')) return;
			this.#isPanning = true;
			this.#panStart = {
				x: e.clientX - this.#panOffset.x,
				y: e.clientY - this.#panOffset.y,
			};
			el.style.cursor = 'grabbing';
		});

		// Pan — mousemove
		window.addEventListener('mousemove', (e) => {
			if (!this.#isPanning) return;
			this.#panOffset = {
				x: e.clientX - this.#panStart.x,
				y: e.clientY - this.#panStart.y,
			};
			this.#applyTransform();
		});

		// Pan — mouseup to stop
		window.addEventListener('mouseup', () => {
			if (!this.#isPanning) return;
			this.#isPanning = false;
			el.style.cursor = '';
		});

		// Zoom — scroll wheel
		el.addEventListener(
			'wheel',
			(e) => {
				e.preventDefault();
				const delta = e.deltaY > 0 ? -0.1 : 0.1;
				this.#zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.#zoom + delta));
				this.#applyTransform();
			},
			{ passive: false },
		);
	}

	#applyTransform() {
		const inner = this.#container.querySelector('.pfu-bond-chart__inner');
		if (!inner) return;
		inner.style.transform = `translate(${this.#panOffset.x}px, ${this.#panOffset.y}px) scale(${this.#zoom})`;
		inner.style.transformOrigin = 'center center';
	}

	resetTransform() {
		this.#panOffset = { x: 0, y: 0 };
		this.#zoom = 1;
		this.#applyTransform();
	}

	// ── Node center (relative to container) ───────────────────────────
	#nodeCenter(id) {
		// Use stored logical positions instead of reading from DOM
		const pos = this.#positions.get(id);
		if (!pos) return null;
		return { x: pos.x, y: pos.y };

		// const node = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${id}"]`);
		// if (!node) return null;
		// const cr = this.#container.getBoundingClientRect();
		// const nr = node.getBoundingClientRect();
		// return {
		// 	x: nr.left + nr.width / 2 - cr.left,
		// 	y: nr.top + nr.height / 2 - cr.top,
		// };
	}

	#bondColor(pairings) {
		if (!pairings?.length) return '#ffffff';
		const pos = pairings.filter((p) => POSITIVE_EMOTIONS.has(p.emotion.toLowerCase())).length;
		const neg = pairings.length - pos;
		if (pos > neg) return '#6aabff';
		if (neg > pos) return '#ff6a6a';
		return '#c06aff';
	}

	#drawLines() {
		const EMOTION_COLOR = {
			admiration: HTMLUtils.getCSSVariable('--bond-admiration'),
			loyalty: HTMLUtils.getCSSVariable('--bond-loyalty'),
			affection: HTMLUtils.getCSSVariable('--bond-affection'),
			inferiority: HTMLUtils.getCSSVariable('--bond-inferiority'),
			mistrust: HTMLUtils.getCSSVariable('--bond-mistrust'),
			hatred: HTMLUtils.getCSSVariable('--bond-hatred'),
		};

		const linesGroup = this.#svg.querySelector('.pfu-bond-chart__lines');
		const hitsGroup = this.#svg.querySelector('.pfu-bond-chart__hits');
		const iconsGroup = this.#svg.querySelector('.pfu-bond-chart__icons');
		const gradientGroup = this.#svg.querySelector('.pfu-bond-chart__gradients');
		linesGroup.innerHTML = '';
		hitsGroup.innerHTML = '';
		iconsGroup.innerHTML = '';
		gradientGroup.innerHTML = '';

		const seen = new Set();
		const uniqueBonds = this.#bonds.filter((bond) => {
			const key = [bond.source, bond.target].sort().join('::');
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		const isTwoWay = (bond) => this.#bonds.some((b) => b.source === bond.target && b.target === bond.source);

		// Distance from focused node (or PC distance if no focus)
		const focusId = this.#focusId ?? this.#data.characters.find((c) => c.isPC)?.id;
		const focusDist = new Map([[focusId, 0]]);
		const adj = new Map(this.#data.characters.map((c) => [c.id, []]));
		this.#bonds.forEach((b) => {
			adj.get(b.source)?.push(b.target);
			adj.get(b.target)?.push(b.source);
		});
		const q = [focusId];
		let qi = 0;
		while (qi < q.length) {
			const cur = q[qi++];
			adj.get(cur)?.forEach((nb) => {
				if (!focusDist.has(nb)) {
					focusDist.set(nb, focusDist.get(cur) + 1);
					q.push(nb);
				}
			});
		}

		uniqueBonds.forEach((bond) => {
			const pa = this.#nodeCenter(bond.source);
			const pb = this.#nodeCenter(bond.target);
			if (!pa || !pb) return;

			const dA = focusDist.get(bond.source) ?? 999;
			const dB = focusDist.get(bond.target) ?? 999;
			const maxD = Math.max(dA, dB);
			const lineOpacity = maxD === 0 ? 0.8 : maxD === 1 ? 0.6 : Math.max(0.1, 0.6 - maxD * 0.15);
			const weight = 1 + (bond.pairings.length / 3) * 4;

			const dx = pb.x - pa.x,
				dy = pb.y - pa.y;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;

			const reverseBond = isTwoWay(bond) ? this.#bonds.find((b) => b.source === bond.target && b.target === bond.source) : null;

			const sourceColor = this.#bondColor(bond.pairings);
			const targetColor = reverseBond ? this.#bondColor(reverseBond.pairings) : sourceColor;

			const gradientId = `pfu-grad-${bond.source}-${bond.target}`.replace(/\./g, '-');
			const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
			grad.setAttribute('id', gradientId);
			grad.setAttribute('gradientUnits', 'userSpaceOnUse');
			grad.setAttribute('x1', pa.x);
			grad.setAttribute('y1', pa.y);
			grad.setAttribute('x2', pb.x);
			grad.setAttribute('y2', pb.y);
			grad.innerHTML = `
                <stop offset="0%"   stop-color="${sourceColor}"/>
                <stop offset="100%" stop-color="${targetColor}"/>
            `;
			gradientGroup.appendChild(grad);

			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', pa.x);
			line.setAttribute('y1', pa.y);
			line.setAttribute('x2', pb.x);
			line.setAttribute('y2', pb.y);
			line.setAttribute('stroke', `url(#${gradientId})`);
			line.setAttribute('stroke-width', weight);
			line.setAttribute('stroke-linecap', 'round');
			line.setAttribute('opacity', lineOpacity);
			line.classList.add('pfu-bond-chart__line');
			linesGroup.appendChild(line);

			const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			hit.setAttribute('x1', pa.x);
			hit.setAttribute('y1', pa.y);
			hit.setAttribute('x2', pb.x);
			hit.setAttribute('y2', pb.y);
			hit.classList.add('pfu-bond-chart__hit');
			hit.addEventListener('mouseenter', () => line.setAttribute('opacity', '1'));
			hit.addEventListener('mouseleave', () => line.setAttribute('opacity', lineOpacity));
			hitsGroup.appendChild(hit);

			// Only show icons if the focus character is involved in this bond
			const focusInvolved = bond.source === focusId || bond.target === focusId;
			if (!focusInvolved) return;

			const mid = {
				x: (pa.x + pb.x) / 2,
				y: (pa.y + pb.y) / 2,
			};

			const directions = reverseBond
				? [
						// From midpoint towards source (pa)
						{ origin: mid, ux: -dx / len, uy: -dy / len, pairings: bond.pairings },
						// From midpoint towards target (pb)
						{ origin: mid, ux: dx / len, uy: dy / len, pairings: reverseBond.pairings },
					]
				: [
						// One-way: from midpoint towards source
						{ origin: mid, ux: -dx / len, uy: -dy / len, pairings: bond.pairings },
					];

			directions.forEach(({ origin, ux, uy, pairings }) => {
				const maxOffset = (len / 2) * 0.85; // stay within half the line
				const iconSpacing = Math.min(26, maxOffset / (pairings.length || 1));
				const iconOffset = iconSpacing * 0.5; // start just off center

				pairings.forEach((pairing, i) => {
					const dist = iconOffset + i * iconSpacing;
					const ix = origin.x + ux * dist;
					const iy = origin.y + uy * dist;
					const icon = FU.bondIcons[pairing.emotion.toLowerCase()] ?? 'fas fa-link';
					const color = EMOTION_COLOR[pairing.emotion.toLowerCase()] ?? '#ffffff';

					const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
					fo.setAttribute('x', ix - 12);
					fo.setAttribute('y', iy - 12);
					fo.setAttribute('width', 24);
					fo.setAttribute('height', 24);
					fo.classList.add('pfu-bond-chart__bond-badge');
					fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml"
                class="pfu-bond-chart__bond-badge-bg"
                style="border-color: ${color};"
                data-tooltip="${pairing.emotion}">
                <i class="${icon} pfu-bond-chart__bond-icon" style="color: ${color};"></i>
            </div>`;
					iconsGroup.appendChild(fo);
				});
			});
		});
	}

	destroy() {
		this.#resizeObserver?.disconnect();
	}
}
