import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { BonusesDataModel } from '../../documents/actors/common/bonuses-data-model.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';

export class SpellsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'spells-table',
		getItems: (d) => d.itemTypes.spell,
		renderDescription: CommonDescriptions.descriptionWithTags(async (item) => {
			const tags = [];
			if (item.system.class.value && item.system.class.value.trim()) {
				let className = item.system.class.value.trim();
				const foundClass = await SpellsTableRenderer.findMatchingClass(item);
				if (foundClass) {
					className = foundClass.name;
				}

				tags.push({
					tag: 'FU.Class',
					separator: ':',
					value: className,
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
		const { attributes, accuracy, damage, useWeapon } = item.system.rollInfo;
		if (item.system.hasRoll.value) {
			data.roll = {
				primary: FU.attributeAbbreviations[attributes.primary.value],
				secondary: FU.attributeAbbreviations[attributes.secondary.value],
				bonus: accuracy.value,
			};
			if (item.actor) {
				const modifiers = BonusesDataModel.collectCheckBonuses(item.actor.system.bonuses, 'magic');
				const bonus = modifiers.reduce((total, m) => total + m.value, 0);
				data.roll.bonus += bonus;
			}
		}
		if (damage.hasDamage.value) {
			data.damage = {
				hrZero: useWeapon.hrZero.value,
				value: damage.value,
				type: FU.damageTypes[damage.type.value],
			};
			if (item.actor) {
				const modifiers = BonusesDataModel.collectDamageBonuses(item.actor.system.bonuses, damage.type, undefined, ['spell']);
				const bonus = modifiers.reduce((total, m) => total + m.amount, 0);
				data.damage.value += bonus;
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
		if (item.actor?.type === 'npc') {
			classes.push('before-spell-icon');
		}
		return classes.join(' ');
	}
	static findMatchingClassInArray(item, classes) {
		const className = item.system?.class?.value;
		if (className) {
			// Search for a class with the same name. If found, set the skill's class attribute to match its fu-id
			const classFound = classes.find((classItem) => {
				return classItem.name === className;
			});
			if (classFound?.system?.fuid) {
				return classFound;
			}

			// Search for a class with a fuid that matches the slugified attribute.
			const skillClassSlug = game.projectfu.util.slugify(className);
			const classFoundWithFuid = classes.find((classItem) => {
				return classItem.system?.fuid === skillClassSlug;
			});
			if (classFoundWithFuid?.system?.fuid) {
				return classFoundWithFuid;
			}
		}
		return;
	}

	static async findMatchingClass(item) {
		if (item.system.class.value) {
			const actorClasses = item.actor.items.filter((arrayItem) => {
				return arrayItem.type === 'class';
			});
			const foundActorClass = SpellsTableRenderer.findMatchingClassInArray(item, actorClasses);
			if (foundActorClass) {
				return foundActorClass;
			}

			const worldClasses = game.items.filter((arrayItem) => {
				return arrayItem.type === 'class';
			});
			const foundWorldClass = SpellsTableRenderer.findMatchingClassInArray(item, worldClasses);
			if (foundWorldClass) {
				return foundWorldClass;
			}

			const compendiumClasses = await CompendiumIndex.instance.getClasses();
			if (compendiumClasses?.class) {
				const foundCompendiumClass = SpellsTableRenderer.findMatchingClassInArray(item, compendiumClasses.class);
				if (foundCompendiumClass) {
					return foundCompendiumClass;
				}
			}
		}
		return;
	}
}
