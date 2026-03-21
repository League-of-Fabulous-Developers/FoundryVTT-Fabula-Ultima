import { FU } from '../helpers/config.mjs';
import { HTMLUtils } from '../helpers/html-utils.mjs';

const POSITIVE_EMOTIONS = new Set(['admiration', 'loyalty', 'affection']);

/**
 * @typedef {Object} BondChartCharacter
 * @property {string} id    - Unique identifier for the character
 * @property {string} name  - Display name
 * @property {string} img   - URL to the character's portrait image
 * @property {FUFactionRelationKey} relation
 */

/**
 * @typedef {Object} BondPairing
 * @property {FUBondEmotion} emotion
 */

/**
 * @typedef {Object} Bond
 * @property {string}        source   - ID of the source character
 * @property {string}        target   - ID of the target character
 * @property {FUFactionRelationKey}  polarity - Whether this is an ally or enemy bond
 * @property {BondPairing[]} pairings - Emotion pairings for this bond (1–3 entries,
 *                                      one per pairing type at most)
 */

/**
 * @typedef {Object} BondChartData
 * @property {BondChartCharacter[]} characters - All characters to display as nodes
 * @property {Bond[]}               bonds      - All bonds between characters
 */

export class FUBondChart {
	#container;
	#svg;
	#bonds;
	#resizeObserver;

	/**
	 * @param {HTMLElement} container
	 * @param {BondChartData} data
	 */
	constructor(container, data) {
		this.#container = container;
		this.#svg = container.querySelector('.pfu-bond-chart__svg');
		this.#bonds = data.bonds;
	}

	render() {
		this.#placeNodes();
		this.#drawLines();

		this.#resizeObserver = new ResizeObserver(() => {
			this.#placeNodes();
			this.#drawLines();
		});
		this.#resizeObserver.observe(this.#container);
	}

	// Position nodes in a circle using CSS left/top
	#placeNodes() {
		const { width, height } = this.#container.getBoundingClientRect();
		const cx = width / 2;
		const cy = height / 2;
		const r = Math.min(width, height) * 0.38;

		const nodes = this.#container.querySelectorAll('.pfu-bond-chart__node');
		const total = nodes.length;

		nodes.forEach((node, i) => {
			// Start at the top (-π/2) and go clockwise
			const angle = (2 * Math.PI * i) / total - Math.PI / 2;
			node.style.left = `${cx + r * Math.cos(angle)}px`;
			node.style.top = `${cy + r * Math.sin(angle)}px`;
		});
	}

	// Get the center of a node element relative to the container
	#nodeCenter(id) {
		const node = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${id}"]`);
		if (!node) return null;
		const containerRect = this.#container.getBoundingClientRect();
		const nodeRect = node.getBoundingClientRect();
		return {
			x: nodeRect.left + nodeRect.width / 2 - containerRect.left,
			y: nodeRect.top + nodeRect.height / 2 - containerRect.top,
		};
	}

	#bondColor(pairings) {
		if (!pairings?.length) return '#ffffff';
		const positiveCount = pairings.filter((p) => POSITIVE_EMOTIONS.has(p.emotion.toLowerCase())).length;
		const negativeCount = pairings.length - positiveCount;
		if (positiveCount > negativeCount) return '#6aabff';
		if (negativeCount > positiveCount) return '#ff6a6a';
		// Equal mix — purple midpoint
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

		uniqueBonds.forEach((bond) => {
			const pa = this.#nodeCenter(bond.source);
			const pb = this.#nodeCenter(bond.target);
			if (!pa || !pb) return;

			const weight = 1 + (bond.pairings.length / 3) * 4;
			const dx = pb.x - pa.x,
				dy = pb.y - pa.y;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;

			const reverseBond = isTwoWay(bond) ? this.#bonds.find((b) => b.source === bond.target && b.target === bond.source) : null;

			const sourceColor = this.#bondColor(bond.pairings);
			const targetColor = reverseBond ? this.#bondColor(reverseBond.pairings) : sourceColor;

			// ── Per-line gradient ────────────────────────────────────────
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

			// ── Single line ──────────────────────────────────────────────
			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', pa.x);
			line.setAttribute('y1', pa.y);
			line.setAttribute('x2', pb.x);
			line.setAttribute('y2', pb.y);
			line.setAttribute('stroke', `url(#${gradientId})`);
			line.setAttribute('stroke-width', weight);
			line.setAttribute('stroke-linecap', 'round');
			line.setAttribute('opacity', '0.6');
			line.classList.add('pfu-bond-chart__line');
			linesGroup.appendChild(line);

			// ── Hit area ─────────────────────────────────────────────────
			const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			hit.setAttribute('x1', pa.x);
			hit.setAttribute('y1', pa.y);
			hit.setAttribute('x2', pb.x);
			hit.setAttribute('y2', pb.y);
			hit.classList.add('pfu-bond-chart__hit');
			hit.addEventListener('mouseenter', (e) => {
				line.setAttribute('opacity', '1');
			});
			hit.addEventListener('mouseleave', () => {
				line.setAttribute('opacity', '0.6');
			});
			hitsGroup.appendChild(hit);

			// ── Icons ────────────────────────────────────────────────────
			const directions = reverseBond
				? [
						{ origin: pa, ux: dx / len, uy: dy / len, pairings: bond.pairings },
						{ origin: pb, ux: -dx / len, uy: -dy / len, pairings: reverseBond.pairings },
					]
				: [{ origin: pa, ux: dx / len, uy: dy / len, pairings: bond.pairings }];

			directions.forEach(({ origin, ux, uy, pairings }) => {
				const iconOffset = 64;
				const iconStep = 26;

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
		this.#resizeObserver.disconnect();
	}
}
