import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';

const technosphereItemTypes = new Set(['hoplosphere', 'mnemosphere']);

/**
 * @type {Record<string, ((item:FUItem) => string|Promise<string>)>}
 */
const descriptionRenderers = {
	hoplosphere: CommonDescriptions.descriptionWithCustomEnrichment((item) =>
		foundry.applications.handlebars.renderTemplate('projectfu.hoplosphere.displayEffects', {
			effects: item.system.effects.map((effect) => ({
				name: effect.effectLabel,
				summary: effect.summary,
				coagulationLevel: effect.coagulationLevel,
			})),
		}),
	),
	mnemosphere: CommonDescriptions.descriptionWithCustomEnrichment(
		(item) =>
			foundry.applications.handlebars.renderTemplate('projectfu.mnemosphere.tableDescription', {
				skills: item.system.activeSkills.map((skill) => ({
					name: skill.name,
					img: skill.img,
					stars: Array.fromRange(skill.system.level.max, 1).map((level) => level <= skill.system.level.value),
				})),
				heroics: item.system.heroics.map((heroic) => ({ name: heroic.name, img: heroic.img })),
			}),
		(item) => [{ tag: 'FU.Class', separator: ':', value: item.system.class, show: !!item.system.class }],
	),
};

/**
 * @type {Record<string, ((item:FUItem) => string|Promise<string>)>}
 */
const detailsRenderers = {
	hoplosphere: CommonColumns.textColumn({
		getText: (item) => {
			const icons = [];
			if (item.system.socketable === 'weapon') {
				icons.push(`<i class="ra ra-sword ra-1xh" data-tooltip="${game.i18n.localize('FU.HoplosphereTooltipSocketableWeaponOnly')}"></i>`);
			}
			if (item.system.requiredSlots === 2) {
				icons.push(`<i class="ra ra-kettlebell ra-1xh" data-tooltip="${game.i18n.localize('FU.HoplosphereTooltipRequiresTwoSlots')}"></i>`);
			}
			if (item.system.effects.some((effect) => effect.coagulationLevel > 1)) {
				icons.push(`<i class="ra ra-droplet ra-1xh" data-tooltip="${game.i18n.localize('FU.HoplosphereTooltipHasCoagulationEffects')}"></i>`);
			}
			return icons.join('');
		},
		alignment: 'center',
	}).renderCell,
	mnemosphere: CommonColumns.textColumn({ getText: (item) => `${item.system.level} / ${item.system.maxLevel}`, alignment: 'center', importance: 'high' }).renderCell,
};

export class TechnospheresTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'technospheres-table',
		getItems: (document) => document.items.filter((item) => technosphereItemTypes.has(item.type)),
		renderDescription: TechnospheresTableRenderer.#renderDescription,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Technospheres', headerSpan: 3 }),
			summary: CommonColumns.textColumn({ getText: (item) => item.system.summary, alignment: 'start' }),
			details: {
				hideHeader: true,
				renderCell: TechnospheresTableRenderer.#renderDetails,
			},
			controls: CommonColumns.itemControlsColumn(
				{ label: 'FU.Technospheres', type: 'mnemosphere,hoplosphere' },
				{
					hideFavorite: (item) => !item.actor.isCharacterType,
					hideShare: (item) => item.actor.type !== 'party',
					hideSell: (item) => !(item.actor.type === 'stash' && item.actor.system.merchant),
					hideLoot: (item) => !(item.actor.type === 'stash' && !item.actor.system.merchant),
				},
			),
		},
	};

	static #renderDescription(item) {
		const descriptionRenderer = descriptionRenderers[item.type];
		return descriptionRenderer ? descriptionRenderer(item) : '';
	}

	static #renderDetails(item) {
		const detailsRenderer = detailsRenderers[item.type];
		return detailsRenderer ? detailsRenderer(item) : '';
	}
}
