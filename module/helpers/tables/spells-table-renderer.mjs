import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';

export class SpellsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'spells-table',
		getItems: (d) => d.itemTypes.spell,
		renderDescription: CommonDescriptions.descriptionWithTags((item) => {
			const tags = [];
			if (item.system.class.value && item.system.class.value.trim()) {
				tags.push({
					tag: 'FU.Class',
					separator: ':',
					value: item.system.class.value.trim(),
				});
			}
			if (item.system.opportunity) {
				tags.push({
					tag: 'FU.Opportunity',
					separator: ':',
					value: item.system.opportunity,
				});
			}
			return tags;
		}),
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Spells', cssClass: SpellsTableRenderer.#getNameCssClasses, renderCaption: SpellsTableRenderer.#renderSpellCaption }),
			duration: CommonColumns.textColumn({ columnLabel: 'FU.Duration', getText: (item) => FU.duration[item.system.duration.value], importance: 'high' }),
			target: CommonColumns.textColumn({
				columnLabel: 'FU.Target',
				getText: SpellsTableRenderer.#getTargetText,
				importance: 'high',
			}),
			mpCost: CommonColumns.textColumn({
				columnLabel: 'FU.MindPointCost',
				getText: SpellsTableRenderer.#getMpCostText,
				importance: 'high',
			}),
			controls: CommonColumns.itemControlsColumn({ label: 'FU.Spell', type: 'spell' }),
		},
	};

	static #renderSpellCaption(item) {
		const data = {};
		if (item.system.hasRoll.value) {
			const { attributes, accuracy, damage, useWeapon } = item.system.rollInfo;
			data.roll = {
				primary: FU.attributeAbbreviations[attributes.primary.value],
				secondary: FU.attributeAbbreviations[attributes.secondary.value],
				bonus: accuracy.value,
			};
			if (damage.hasDamage.value) {
				data.damage = {
					hrZero: useWeapon.hrZero.value,
					value: damage.value,
					type: FU.damageTypes[damage.type.value],
				};
			}
		}
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-spell'), data);
	}

	static #getTargetText(item) {
		return item.system.targeting.getTargetTranslationKey();
	}

	static #getMpCostText(item) {
		const cost = item.system.cost;

		if (cost.amount === 0) {
			return '—';
		}

		if (cost.perTarget) {
			return `${cost.amount} ${game.i18n.localize(FU.resourcesAbbr[cost.resource])} ${game.i18n.localize('FU.CostPerTargetAbbreviation')}`;
		} else {
			return `${cost.amount} ${game.i18n.localize(FU.resourcesAbbr[cost.resource])}`;
		}
	}

	static #getNameCssClasses(item) {
		const classes = [];
		if (item.system.hasRoll.value) {
			classes.push('after-offensive-spell-icon');
		}
		if (item.actor.type === 'npc') {
			classes.push('before-spell-icon');
		}
		return classes.join(' ');
	}
}
