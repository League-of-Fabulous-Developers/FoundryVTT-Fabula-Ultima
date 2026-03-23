import { FU } from '../helpers/config.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';

const POSITIVE_EMOTIONS = new Set(['admiration', 'loyalty', 'affection']);

export class FUBondChart {
	#container;
	#svg;
	#data;
	#bonds;
	#positions = new Map(); // id → {x, y}
	#focusId = null;
	#resizeObserver;

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
				this.#refocus(id);
			});
		});
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
		const maxRadius = Math.min(width, height) * 0.75; // was 0.46
		const minR = Math.min(width, height) * 0.3; // was 0.22

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

		setTimeout(() => this.#drawLines(), 420);
	}

	// ── Node center (relative to container) ───────────────────────────
	#nodeCenter(id) {
		const node = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${id}"]`);
		if (!node) return null;
		const cr = this.#container.getBoundingClientRect();
		const nr = node.getBoundingClientRect();
		return {
			x: nr.left + nr.width / 2 - cr.left,
			y: nr.top + nr.height / 2 - cr.top,
		};
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

			// Icons only on bonds close to the focus
			//if (maxD > 1) return;

			const directions = reverseBond
				? [
						{ origin: pa, ux: dx / len, uy: dy / len, pairings: bond.pairings },
						{ origin: pb, ux: -dx / len, uy: -dy / len, pairings: reverseBond.pairings },
					]
				: [{ origin: pa, ux: dx / len, uy: dy / len, pairings: bond.pairings }];

			directions.forEach(({ origin, ux, uy, pairings }) => {
				// Clamp iconOffset to at most 40% of the line length
				// so icons always stay on the line regardless of node proximity
				const maxOffset = len * 0.4;
				const iconOffset = Math.min(64, maxOffset);
				const iconStep = Math.min(26, (maxOffset - iconOffset) / (pairings.length || 1));

				pairings.forEach((pairing, i) => {
					const dist = iconOffset + i * iconStep;
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
