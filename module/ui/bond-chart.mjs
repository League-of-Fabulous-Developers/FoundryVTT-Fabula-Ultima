import { FU } from '../helpers/config.mjs';

const PAIRING_ICONS = {
	'admiration-inferiority': { admiration: FU.bondIcons.admiration, inferiority: FU.bondIcons.inferiority },
	'loyalty-mistrust': { loyalty: FU.bondIcons.loyalty, mistrust: FU.bondIcons.mistrust },
	'affection-hatred': { affection: FU.bondIcons.affection, hatred: FU.bondIcons.hatred },
};

const POLARITY_COLORS = {
	ally: { line: '#6aabff', filter: 'url(#pfu-glow-ally)' },
	enemy: { line: '#ff6a6a', filter: 'url(#pfu-glow-enemy)' },
};

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
	#tooltip;
	#bonds;
	#resizeObserver;

	/**
	 * @param {HTMLElement} container
	 * @param {BondChartData} data
	 */
	constructor(container, data) {
		this.#container = container;
		this.#svg = container.querySelector('.pfu-bond-chart__svg');
		this.#tooltip = container.querySelector('.pfu-bond-chart__tooltip');
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

	#drawLines() {
		const linesGroup = this.#svg.querySelector('.pfu-bond-chart__lines');
		const hitsGroup = this.#svg.querySelector('.pfu-bond-chart__hits');
		const iconsGroup = this.#svg.querySelector('.pfu-bond-chart__icons');
		linesGroup.innerHTML = '';
		hitsGroup.innerHTML = '';
		iconsGroup.innerHTML = '';

		// Remove pairs that already have an active bond
		const seen = new Set();
		const uniqueBonds = this.#bonds.filter((bond) => {
			const key = [bond.source, bond.target].sort().join('::');
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		const isTwoWay = (bond) => this.#bonds.some((b) => b.source === bond.target && b.target === bond.source);
		const makeFilter = (id) => {
			const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
			filter.setAttribute('id', id);
			filter.setAttribute('x', '0%');
			filter.setAttribute('y', '0%');
			filter.setAttribute('width', '100%');
			filter.setAttribute('height', '100%');
			filter.setAttribute('filterUnits', 'userSpaceOnUse'); // ← key change
			filter.innerHTML = `
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  `;
			return filter;
		};

		const defs = this.#svg.querySelector('defs');
		defs.querySelectorAll('.pfu-bond-chart__filter').forEach((f) => f.remove());

		['pfu-glow-ally', 'pfu-glow-enemy'].forEach((id) => {
			const f = makeFilter(id);
			f.classList.add('pfu-bond-chart__filter');
			defs.appendChild(f);
		});

		// ── Draw active bond lines ─────────────────────────────────────
		uniqueBonds.forEach((bond) => {
			const pa = this.#nodeCenter(bond.source);
			const pb = this.#nodeCenter(bond.target);
			if (!pa || !pb) return;

			const polarity = POLARITY_COLORS[bond.polarity] ?? POLARITY_COLORS.ally;
			const weight = 1 + (bond.pairings.length / 3) * 4;

			const dx = pb.x - pa.x,
				dy = pb.y - pa.y;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;

			// ── Single line ──────────────────────────────────────────────
			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', pa.x);
			line.setAttribute('y1', pa.y);
			line.setAttribute('x2', pb.x);
			line.setAttribute('y2', pb.y);
			line.setAttribute('stroke', polarity.line);
			line.setAttribute('stroke-width', weight);
			line.setAttribute('stroke-linecap', 'round');
			line.setAttribute('opacity', '0.6');
			//line.setAttribute('filter', polarity.filter);
			line.classList.add('pfu-bond-chart__line');

			const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			hit.setAttribute('x1', pa.x);
			hit.setAttribute('y1', pa.y);
			hit.setAttribute('x2', pb.x);
			hit.setAttribute('y2', pb.y);
			hit.classList.add('pfu-bond-chart__hit');
			hit.addEventListener('mouseenter', (e) => {
				line.setAttribute('opacity', '1');
				this.#showTooltip(e, bond);
			});
			hit.addEventListener('mouseleave', () => {
				line.setAttribute('opacity', '0.6');
				this.#hideTooltip();
			});

			hitsGroup.append(hit);
			linesGroup.append(line, hit);

			// ── Pairing icons near source, offset along the normal ───────

			// For two-way bonds, also draw icons near the target pointing back
			const directions = isTwoWay(bond)
				? [
						{ origin: pa, sign: 1 },
						{ origin: pb, sign: -1 },
					]
				: [{ origin: pa, sign: 1 }];

			directions.forEach(({ origin, sign }) => {
				const iconOffset = 60;
				const iconStep = 14;

				// Unit vector in the direction from this origin toward the other node
				const ux = (dx / len) * sign;
				const uy = (dy / len) * sign;

				bond.pairings.forEach((pairing, i) => {
					const dist = iconOffset + i * iconStep;
					const ix = origin.x + ux * dist;
					const iy = origin.y + uy * dist;
					const key = pairing.emotion.toLowerCase();
					const icon = FU.bondIcons[key] ?? 'fas fa-link';

					const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
					fo.setAttribute('x', ix - 8);
					fo.setAttribute('y', iy - 8);
					fo.setAttribute('width', 16);
					fo.setAttribute('height', 16);
					fo.innerHTML = `<i xmlns="http://www.w3.org/1999/xhtml"
  class="fu-icon--xs ${icon} pfu-bond-chart__bond-icon"
  style="color:${polarity.line};">
</i>`;
					iconsGroup.append(fo);
				});
			});
		});
	}

	#showTooltip(event, bond) {
		const srcNode = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${bond.source}"]`);
		const tgtNode = this.#container.querySelector(`.pfu-bond-chart__node[data-id="${bond.target}"]`);
		const srcName = srcNode?.querySelector('span')?.textContent ?? bond.source;
		const tgtName = tgtNode?.querySelector('span')?.textContent ?? bond.target;

		this.#tooltip.querySelector('.pfu-bond-chart__tooltip-names').textContent = `${srcName} — ${tgtName}`;

		// One row per pairing
		const pairingEl = this.#tooltip.querySelector('.pfu-bond-chart__tooltip-pairing');
		pairingEl.innerHTML = bond.pairings
			.map((p) => {
				const def = PAIRING_ICONS[p.type];
				return `<span>
      <i class="fas ${def?.icon ?? 'fa-link'}"></i>
      ${def?.label ?? p.type} — ${p.strength}
    </span>`;
			})
			.join('');

		this.#tooltip.querySelector('.pfu-bond-chart__tooltip-strength').textContent = bond.polarity;

		const containerRect = this.#container.getBoundingClientRect();
		this.#tooltip.hidden = false;
		this.#tooltip.style.left = `${event.clientX - containerRect.left + 12}px`;
		this.#tooltip.style.top = `${event.clientY - containerRect.top + 12}px`;
	}

	#hideTooltip() {
		this.#tooltip.hidden = true;
		// Clear appended pairing text to avoid duplicates on next hover
		const pairingEl = this.#tooltip.querySelector('.pfu-bond-chart__tooltip-pairing');
		pairingEl.childNodes.forEach((n) => {
			if (n.nodeType === Node.TEXT_NODE) n.remove();
		});
	}

	destroy() {
		this.#resizeObserver.disconnect();
	}
}
