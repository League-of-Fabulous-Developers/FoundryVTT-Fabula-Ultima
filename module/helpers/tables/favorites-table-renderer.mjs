import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { FU, SYSTEM } from '../config.mjs';
import { SETTINGS } from '../../settings.js';
import { ProgressDataModel } from '../../documents/items/common/progress-data-model.mjs';
import { TextEditor } from '../text-editor.mjs';

const customWeaponFormTranslations = {
	primaryForm: 'FU.CustomWeaponFormPrimary',
	secondaryForm: 'FU.CustomWeaponFormSecondary',
};

/**
 * @type {Record<string, ((FUItem) => string)>}
 */
const nameCssClassCustomizers = {
	armor: (item) => (item.system.isMartial.value ? 'after-martial-item-icon' : ''),
	basic: (item) => (item.system.type.value === 'melee' ? 'before-melee-icon' : 'before-ranged-icon'),
	customWeapon: (item) => (item.system.isMartial ? 'after-martial-item-icon' : ''),
	miscAbility: (item) => (item.actor.type === 'npc' ? 'before-ability-icon' : ''),
	shield: (item) => (item.system.isMartial.value ? 'after-martial-item-icon' : ''),
	spell: (item) => {
		const cssClasses = [];
		if (item.actor.type === 'npc') {
			cssClasses.push('before-spell-icon');
		}

		if (item.system.hasRoll.value) {
			cssClasses.push('after-offensive-spell-icon');
		}
		return cssClasses.join(' ');
	},
	weapon: (item) => (item.system.isMartial.value ? 'after-martial-item-icon' : ''),
};

async function renderFeatureDescription(item) {
	const FeatureDataModel = item.system.data.constructor;
	return foundry.applications.handlebars.renderTemplate(FeatureDataModel.expandTemplate, { ...item, item: item, additionalData: await FeatureDataModel.getAdditionalData(item.system.data) });
}

/**
 * Maps from Item type to a renderer that should be used.
 * @type {Record<string, ((FUItem) => string|Promise<string>)>}
 */
const descriptionRenderers = {
	accessory: CommonDescriptions.descriptionWithTags((item) => {
		const tags = item.system.getTags();
		if (item.system.quality.value) {
			tags.push({
				tag: 'FU.Quality',
				separator: ':',
				value: item.system.quality.value,
			});
		}
		return tags;
	}),
	armor: CommonDescriptions.descriptionWithTechnospheres(
		(item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.mnemosphereSlots }),
		(item) => {
			const tags = [];
			tags.push({
				tag: 'FU.DefenseAbbr',
				separator: ':',
				value: item.system.def.attribute ? `${game.i18n.localize(FU.attributeAbbreviations[item.system.def.attribute])} + ${item.system.def.value}` : `${item.system.def.value}`,
			});
			tags.push({
				tag: 'FU.MagicDefenseAbbr',
				separator: ':',
				value: item.system.mdef.attribute ? `${game.i18n.localize(FU.attributeAbbreviations[item.system.mdef.attribute])} + ${item.system.mdef.value}` : `${item.system.def.value}`,
			});
			tags.push({
				tag: 'FU.InitiativeAbbr',
				separator: ':',
				value: item.system.init.value,
			});
			if (item.system.quality.value) {
				tags.push({
					tag: 'FU.Quality',
					separator: ':',
					value: item.system.quality.value,
				});
			}
			return tags;
		},
		'flex',
	),
	basic: CommonDescriptions.simpleDescription(),
	behavior: CommonDescriptions.descriptionWithTags((item) => (item.system.weight.value ? [{ tag: 'FU.BehaviorWeight', separator: ':', value: item.system.weight.value }] : [])),
	class: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
	classFeature: CommonDescriptions.descriptionWithCustomEnrichment(renderFeatureDescription),
	customWeapon: CommonDescriptions.descriptionWithTechnospheres(
		(item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.mnemosphereSlots }),
		(item) => {
			const tags = [];
			if (item.system.quality) {
				tags.push({
					tag: 'FU.Quality',
					separator: ':',
					value: item.system.quality,
				});
			}
			tags.push({ tag: FU.weaponTypes[item.system.type] });
			tags.push({ tag: FU.weaponCategories[item.system.category] });
			tags.push({ tag: 'FU.Versus', value: game.i18n.localize(FU.defenses[item.system.defense].abbr) });
			tags.push({
				tag: 'FU.Cost',
				separator: ':',
				value: item.system.cost,
			});
			return tags;
		},
		'flex',
	),
	optionalFeature: CommonDescriptions.descriptionWithCustomEnrichment(renderFeatureDescription),
	consumable: CommonDescriptions.descriptionWithTags((item) => [{ tag: 'FU.InventoryCost', separator: ':', value: item.system.ipCost.value }]),
	heroic: CommonDescriptions.simpleDescription(),
	hoplosphere: CommonDescriptions.descriptionWithCustomEnrichment((item) =>
		foundry.applications.handlebars.renderTemplate('projectfu.hoplosphere.displayEffects', {
			effects: item.system.effects.map((effect) => ({
				name: effect.effectLabel,
				summary: effect.summary,
				coagulationLevel: effect.coagulationLevel,
			})),
		}),
	),
	miscAbility: CommonDescriptions.simpleDescription(),
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
	mnemosphereReceptacle: CommonDescriptions.descriptionWithTechnospheres((item) => ({ slotted: item.system.slotted, totalSlots: item.system.slotCount, maxMnemospheres: item.system.slotCount }), null, 'flex'),
	project: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
	ritual: CommonDescriptions.descriptionWithTags((item) => [
		{ tag: 'FU.MindPointCost', separator: ':', value: item.system.mpCost.value },
		{ tag: 'FU.DLAbbr', value: item.system.dLevel.value },
	]),
	rule: CommonDescriptions.simpleDescription(),
	shield: CommonDescriptions.descriptionWithTags((item) => {
		const tags = [];
		if (item.system.def.value) {
			tags.push({ tag: 'FU.DefenseAbbr', value: item.system.def.value < 0 ? `- ${Math.abs(item.system.def.value)}` : `+ ${item.system.def.value}` });
		}
		if (item.system.mdef.value) {
			tags.push({ tag: 'FU.MagicDefenseAbbr', value: item.system.mdef.value < 0 ? `- ${Math.abs(item.system.mdef.value)}` : `+ ${item.system.mdef.value}` });
		}
		if (item.system.quality.value) {
			tags.push({
				tag: 'FU.Quality',
				separator: ':',
				value: item.system.quality.value,
			});
		}
		return tags;
	}),
	skill: CommonDescriptions.simpleDescription(),
	spell: CommonDescriptions.descriptionWithTags((item) => item.system.getTags()),
	treasure: CommonDescriptions.descriptionWithTags((item) => {
		const tags = [
			{
				tag: FU.treasureType[item.system.subtype.value],
			},
		];
		if (item.system.cost.value) {
			tags.push({
				value: `${item.system.cost.value} ${game.settings.get(SYSTEM, SETTINGS.optionRenameCurrency)}`,
			});
		}
		if (item.system.quantity.value) {
			tags.push({
				tag: 'FU.Quantity',
				separator: ':',
				value: item.system.quantity.value,
			});
		}
		if (item.system.origin.value) {
			tags.push({
				tag: 'FU.Origin',
				separator: ':',
				value: item.system.origin.value,
			});
		}
		return tags;
	}),
	weapon: CommonDescriptions.descriptionWithTags((item) => {
		const tags = [];
		tags.push({ tag: FU.handedness[item.system.hands.value] });
		tags.push({ tag: FU.weaponTypes[item.system.type.value] });
		tags.push({ tag: FU.weaponCategories[item.system.category.value] });
		tags.push({ tag: 'FU.Versus', value: game.i18n.localize(FU.defenses[item.system.defense].abbr) });
		tags.push({
			tag: 'FU.Cost',
			separator: ':',
			value: item.system.cost.value,
		});
		if (item.system.quality.value) {
			tags.push({
				tag: 'FU.Quality',
				separator: ':',
				value: item.system.quality.value,
			});
		}
		return tags;
	}),
};

/**
 * @typedef RenderCheckCheck
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} bonus
 */
/**
 * @param {RenderCheckCheck} check
 */
function renderCheck(check) {
	const { primary, secondary, bonus } = check;
	return `【${game.i18n.localize(FU.attributeAbbreviations[primary])} + ${game.i18n.localize(FU.attributeAbbreviations[secondary])}】${bonus ? `${bonus < 0 ? '-' : '+'} ${Math.abs(bonus)}` : ''}`;
}

/**
 * @typedef RenderDamageDamage
 * @property {number} value
 * @property {DamageType} type
 * @property {boolean} [hrZero]
 */
/**
 * @param {RenderDamageDamage} damage
 */
function renderDamage(damage) {
	const { type, value, hrZero } = damage;
	return `【${game.i18n.localize(hrZero ? 'FU.HRZero' : 'FU.HighRollAbbr')} ${value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`}】${type ? game.i18n.localize(FU.damageTypes[type]) : ''}`;
}

/**
 * @typedef CheckData
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} bonus
 */

/**
 * @type {Record<string, ((item: FUItem, base: CheckData) => CheckData)>}
 */
const checkDataGetter = {
	weapon: (weapon, baseCheck) => ({
		primary: weapon.system.attributes.primary.value,
		secondary: weapon.system.attributes.secondary.value,
		bonus: weapon.system.accuracy.value + baseCheck.bonus,
	}),
	customWeapon: (customWeapon, baseCheck) => ({
		primary: customWeapon.system.attributes.primary,
		secondary: customWeapon.system.attributes.secondary,
		bonus: customWeapon.system.accuracy + baseCheck.bonus,
	}),
};

/**
 * @param {FUItem} item
 * @param {CheckData} baseCheck
 * @return {CheckData|null}
 */
function getCheckData(item, baseCheck) {
	const getter = checkDataGetter[item?.type];
	if (getter) {
		return getter(item, baseCheck);
	} else {
		return null;
	}
}

/**
 * @typedef TableDamageData
 * @property {number} value
 * @property {DamageType} type
 * @property {boolean} hrZero
 */

/**
 * @type {Record<string, ((item: FUItem, base: TableDamageData) => TableDamageData)>}
 */
const damageDataGetter = {
	weapon: (weapon, baseDamage) => ({
		value: baseDamage.value + weapon.system.damage.value,
		type: baseDamage.type || weapon.system.damageType.value,
		hrZero: baseDamage.hrZero,
	}),
	customWeapon: (customWeapon, baseDamage) => ({
		value: baseDamage.value + customWeapon.system.damage.value,
		type: baseDamage.type || customWeapon.system.damage.type,
		hrZero: baseDamage.hrZero,
	}),
};

/**
 * @param {FUItem} item
 * @param {TableDamageData} base
 * @return {null|TableDamageData}
 */
function getDamageData(item, base) {
	const getter = damageDataGetter[item?.type];
	if (getter) {
		return getter(item, base);
	} else {
		return null;
	}
}

/**
 * Maps from Item type to a renderer that should be used.
 * Favorite captions should only be used for absolutely essential information like checks and damage values.
 * Other information should be accessible through the collapsible description as to not bloat the height of the table.
 * @type {Record<string, ((FUItem) => string|Promise<string>)>}
 */
const captionRenderers = {
	basic: (item) => {
		const check = {
			primary: item.system.attributes.primary.value,
			secondary: item.system.attributes.secondary.value,
			bonus: item.system.accuracy.value,
		};
		const damage = {
			value: item.system.damage.value,
			type: item.system.damageType.value,
			hrZero: item.system.rollInfo.useWeapon.hrZero.value,
		};
		return renderCheck(check) + ' ⬥' + renderDamage(damage);
	},
	customWeapon: (item) => {
		const parts = [];
		const check = {
			primary: item.system.attributes.primary,
			secondary: item.system.attributes.secondary,
			bonus: item.system.accuracy,
		};
		parts.push(renderCheck(check));
		const damage = {
			value: item.system.damage.value,
			type: item.system.damage.type,
			hrZero: false,
		};
		parts.push(renderDamage(damage));

		if (item.system.isTransforming) {
			if (item.system[item.system.activeForm].name) {
				parts.unshift(item.system[item.system.activeForm].name);
			} else {
				parts.unshift(game.i18n.localize(customWeaponFormTranslations[item.system.activeForm]));
			}
		}
		return parts.join(' ⬥');
	},
	miscAbility: (item) => {
		const blocks = [];
		if (item.system.hasRoll.value) {
			const baseCheck = {
				primary: item.system.attributes.primary,
				secondary: item.system.attributes.secondary,
				bonus: item.system.accuracy,
			};

			const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);

			const weaponCheck = getCheckData(mainHandItem, baseCheck);
			if (item.system.useWeapon.accuracy && weaponCheck) {
				blocks.push(renderCheck(weaponCheck));
			} else {
				blocks.push(renderCheck(baseCheck));
			}
			if (item.system.damage.hasDamage) {
				const baseDamage = {
					value: item.system.damage.value,
					type: item.system.damage.type,
					hrZero: item.system.damage.hrZero,
				};

				const weaponDamage = getDamageData(mainHandItem, baseDamage);
				if (item.system.useWeapon.damage && weaponDamage) {
					blocks.push(renderDamage(weaponDamage));
				} else {
					blocks.push(renderDamage(baseDamage));
				}
			}
		}
		return blocks.join(' ⬥');
	},
	skill: (item) => {
		const blocks = [];
		if (item.system.hasRoll.value) {
			const baseCheck = {
				primary: item.system.attributes.primary,
				secondary: item.system.attributes.secondary,
				bonus: item.system.accuracy,
			};

			const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);

			const weaponCheck = getCheckData(mainHandItem, baseCheck);
			if (item.system.useWeapon.accuracy && weaponCheck) {
				blocks.push(renderCheck(weaponCheck));
			} else {
				blocks.push(renderCheck(baseCheck));
			}
			if (item.system.damage.hasDamage) {
				const baseDamage = {
					value: item.system.damage.value,
					type: item.system.damage.type,
					hrZero: item.system.damage.hrZero,
				};

				const weaponDamage = getDamageData(mainHandItem, baseDamage);
				if (item.system.useWeapon.damage && weaponDamage) {
					blocks.push(renderDamage(weaponDamage));
				} else {
					blocks.push(renderDamage(baseDamage));
				}
			}
		}
		return blocks.join(' ⬥');
	},
	spell: (item) => {
		const blocks = [];
		if (item.system.hasRoll.value) {
			blocks.push(
				renderCheck({
					primary: item.system.rollInfo.attributes.primary.value,
					secondary: item.system.rollInfo.attributes.secondary.value,
					bonus: item.system.rollInfo.accuracy.value,
				}),
			);

			if (item.system.rollInfo.damage.hasDamage.value) {
				blocks.push(
					renderDamage({
						type: item.system.rollInfo.damage.type.value,
						value: item.system.rollInfo.damage.value,
						hrZero: item.system.rollInfo.useWeapon.hrZero.value,
					}),
				);
			}
		}
		return blocks.join(' ⬥');
	},
	weapon: (item) => {
		const check = {
			primary: item.system.attributes.primary.value,
			secondary: item.system.attributes.secondary.value,
			bonus: item.system.accuracy.value,
		};
		const damage = {
			value: item.system.damage.value,
			type: item.system.damageType.value,
			hrZero: item.system.rollInfo.useWeapon.hrZero.value,
		};
		return renderCheck(check) + ' ⬥' + renderDamage(damage);
	},
};

async function renderFeatureDetails(item) {
	const FeatureDataModel = item.system.data.constructor;
	return foundry.applications.handlebars.renderTemplate(FeatureDataModel.previewTemplate, { ...item, item: item, additionalData: await FeatureDataModel.getAdditionalData(item.system.data) });
}

const classDetailsRenderer = CommonColumns.textColumn({
	importance: 'high',
	alignment: 'end',
	getText: (item) => `${game.i18n.localize('FU.Level')}: ${item.system.level.value} / ${item.system.level.max}`,
}).renderCell;

const heroicDetailsRenderer = CommonColumns.resourceColumn({
	action: 'updateHeroicResource',
	getResource: (item) => (item.system.hasResource.value ? item.system.rp : null),
	increaseAttributes: { 'data-resource-action': 'increment' },
	decreaseAttributes: { 'data-resource-action': 'decrement' },
}).renderCell;

const renderSummary = () => {
	return CommonColumns.textColumn({ alignment: 'start', cssClass: 'cell-text--no-overflow', getText: (item) => item.system.summary.value ?? '', tooltip: (item) => item.system.summary.value ?? '' }).renderCell;
};

function renderProjectDetails() {
	const data = {
		action: 'updateProgress',
		increaseAttributes: { 'data-progress-action': 'increase' },
		decreaseAttributes: { 'data-progress-action': 'decrease' },
	};
	return async (item) => {
		const progress = item.system.progress;
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-project-progress'), { ...data, data: progress, layout: 'stacked' });
	};
}

function renderAbilityDetails() {
	const summaryRenderer = renderSummary();
	return (item) => {
		let clock;
		if (item.system.hasClock.value) {
			const clockData = new ProgressDataModel(item.system.progress.toObject(true));
			clockData.updateSource({ name: '' });
			clock = {
				data: clockData,
				clockSize: 20,
			};
		}

		let resource;
		if (item.system.hasResource.value) {
			const resourceData = new ProgressDataModel(item.system.rp.toObject(true));
			if (clock) {
				resourceData.updateSource({ name: '' });
			}
			resource = {
				data: resourceData,
				layout: 'flat',
			};
		}

		if (resource || clock) {
			return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-ability-combined-progress'), {
				resource: resource,
				clock: clock,
			});
		} else {
			return summaryRenderer(item);
		}
	};
}

function renderSkillDetails() {
	const summaryRenderer = renderSummary();
	return (item) => {
		let resource;
		if (item.system.hasResource.value) {
			resource = {
				data: item.system.rp,
				action: 'updateSkillResource',
				increaseAttributes: { 'data-resource-action': 'increment' },
				decreaseAttributes: { 'data-resource-action': 'decrement' },
				layout: 'flat',
			};
		}

		if (resource) {
			return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-resource'), resource);
		} else {
			return summaryRenderer(item);
		}
	};
}

/**
 * @type {Record<string, ((FUItem) => string|Promise<string>)>}
 */
const detailsRenderers = {
	accessory: (item) => {
		const data = {
			summary: item.system.summary.value,
			action: 'equipAccessory',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				accessory: 'fas fa-leaf ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-equip-status'), data);
	},
	armor: (item) => {
		const data = {
			summary: item.system.summary.value,
			action: 'equipArmor',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				armor: 'ra ra-helmet ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-equip-status'), data);
	},
	basic: renderSummary(),
	behavior: renderSummary(),
	class: classDetailsRenderer,
	classFeature: renderFeatureDetails,
	customWeapon: (item) => {
		const data = {
			summary: item.system.summary,
			action: 'equipWeapon',
			equipTooltip: 'FU.EquipWeapon',
			unequipTooltip: 'FU.UnequipWeapon',
			icons: {
				mainHand: 'ra ra-sword ra-1xh ra-flip-horizontal',
				offHand: 'ra ra-plain-dagger ra-1xh ra-rotate-180',
				bothHands: 'is-two-weapon equip ra-1xh',
				phantom: 'ra ra-daggers ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};

		if (item.system.isTransforming) {
			const activeForm = item.system.activeForm;
			const newForm = activeForm === 'primaryForm' ? 'secondaryForm' : 'primaryForm';
			data.transform = {
				action: 'switchForm',
				tooltip: game.i18n.format('FU.CustomWeaponFormSwitchTooltip', { newForm: item.system[newForm].name || game.i18n.localize(customWeaponFormTranslations[newForm]) }),
			};
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-equip-status'), data);
	},
	optionalFeature: renderFeatureDetails,
	consumable: renderSummary(),
	heroic: heroicDetailsRenderer,
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
		alignment: 'end',
	}).renderCell,
	miscAbility: renderAbilityDetails(),
	mnemosphere: CommonColumns.textColumn({ getText: (item) => `${item.system.level} / ${item.system.maxLevel}`, alignment: 'end', importance: 'high' }).renderCell,
	project: renderProjectDetails(),
	ritual: renderSummary(),
	rule: renderSummary(),
	shield: (item) => {
		const data = {
			summary: item.system.summary.value,
			action: 'equipShield',
			equipTooltip: 'FU.EquipArmor',
			unequipTooltip: 'FU.UnequipArmor',
			icons: {
				mainHand: 'ra ra-heavy-shield ra-1xh',
				offHand: 'ra ra-shield ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-equip-status'), data);
	},
	skill: renderSkillDetails(),
	spell: renderSummary(),
	treasure: renderSummary(),
	weapon: (item) => {
		const data = {
			summary: item.system.summary.value,
			action: 'equipWeapon',
			equipTooltip: 'FU.EquipWeapon',
			unequipTooltip: 'FU.UnequipWeapon',
			icons: {
				mainHand: 'ra ra-sword ra-1xh ra-flip-horizontal',
				offHand: 'ra ra-plain-dagger ra-1xh ra-rotate-180',
				bothHands: 'is-two-weapon equip ra-1xh',
				phantom: 'ra ra-daggers ra-1xh',
			},
			slot: item.actor.system.equipped.getEquippedSlot(item),
		};
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-favorite-details-equip-status'), data);
	},
};

const sortMethods = {
	default: {
		name: 'FU.SortDefault',
		ascending: 'fa-sort',
		descending: 'fa-sort-down',
	},
	alphabetical: {
		name: 'FU.SortAlphabetical',
		ascending: 'fa-arrow-up-a-z',
		descending: 'fa-arrow-down-a-z',
	},
	type: {
		name: 'FU.SortType',
		ascending: 'fa-arrow-up-short-wide',
		descending: 'fa-arrow-down-wide-short',
	},
};

export class FavoritesTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'favorites-table',
		getItems: FavoritesTableRenderer.#getItems,
		sort: FavoritesTableRenderer.#sort,
		renderRowCaption: FavoritesTableRenderer.#renderFullRowCaption,
		renderDescription: FavoritesTableRenderer.#renderDescription,
		columns: {
			name: {
				...CommonColumns.itemNameColumn({ headerSpan: 2, cssClass: FavoritesTableRenderer.#customizeNameCssClass }),
				renderHeader: FavoritesTableRenderer.#renderNameColumnHeader,
			},
			details: {
				hideHeader: true,
				renderCell: FavoritesTableRenderer.#renderDetailsCell,
			},
			controls: CommonColumns.itemControlsColumn({ headerAlignment: 'end', custom: FavoritesTableRenderer.#renderControlsColumnHeader }),
		},
		actions: {
			sortFavorites: FavoritesTableRenderer.#toggleSort,
			technosphere: FavoritesTableRenderer.#technosphereAction,
		},
		dragDrop: [
			{
				dropSelector: '.description-with-slots__slots-container .description-with-slots__slot--empty',
				permissions: {
					drop: FavoritesTableRenderer.#canDrop,
				},
				callbacks: {
					drop: FavoritesTableRenderer.#onDrop,
				},
			},
		],
	};

	/**
	 * @type {"default", "alphabetical", "type"}
	 */
	#sortMethod = 'default';

	/**
	 * @type {-1,1}
	 */
	#sortOrder = 1;

	static #getItems(actor) {
		const favorites = [];
		for (const item of actor.allItems()) {
			if (item.isFavorite) {
				favorites.push(item);
			}
		}
		return favorites;
	}

	static #sort(a, b) {
		switch (this.#sortMethod) {
			case 'alphabetical':
				return a.name.localeCompare(b.name) * this.#sortOrder;
			case 'type': {
				const typeA = game.i18n.localize(CONFIG.Item.typeLabels[a.type]);
				const typeB = game.i18n.localize(CONFIG.Item.typeLabels[b.type]);
				return typeA.localeCompare(typeB) * this.#sortOrder;
			}
			default:
				return (a.sort - b.sort) * this.#sortOrder;
		}
	}

	static #toggleSort(event) {
		if (event.button === 0) {
			this.#sortOrder *= -1;
		}
		if (event.button === 2) {
			const sortMethodKeys = Object.keys(sortMethods);
			const currentMethodIdx = sortMethodKeys.indexOf(this.#sortMethod);
			this.#sortMethod = sortMethodKeys[(currentMethodIdx + 1) % sortMethodKeys.length];
		}
		this.application.render();
	}

	static #renderDescription(item) {
		const descriptionRenderer = descriptionRenderers[item.type];
		return descriptionRenderer instanceof Function ? descriptionRenderer(item) : '';
	}

	static #renderNameColumnHeader() {
		return `<span>
	<i class="fas fa-star icon"></i>
	${game.i18n.localize('FU.Favorite')}
</span>`;
	}

	static #renderFullRowCaption(item) {
		const captionRenderer = captionRenderers[item.type];
		return captionRenderer instanceof Function ? captionRenderer(item) : '';
	}

	static #customizeNameCssClass(item) {
		const customizer = nameCssClassCustomizers[item.type];
		return customizer instanceof Function ? customizer(item) : '';
	}

	static #renderDetailsCell(item) {
		const detailsRenderer = detailsRenderers[item.type];
		return detailsRenderer instanceof Function ? detailsRenderer(item) : '';
	}

	static #renderControlsColumnHeader() {
		let icon;
		const sortMethod = sortMethods[this.#sortMethod];
		if (sortMethod) {
			icon = sortMethod[this.#sortOrder === 1 ? 'ascending' : 'descending'];
		}
		icon ??= 'fa-sort'; // fallback

		return `<a data-action="sortFavorites" data-tooltip="${game.i18n.localize(sortMethod.name)}">
	<i class="fas ${icon} icon"></i>
	${game.i18n.localize('FU.Sort')}
</a>`;
	}

	static async #technosphereAction(event, target) {
		const item = await fromUuid(target.closest('[data-uuid]')?.dataset?.uuid);
		const technosphere = await fromUuid(target.closest('[data-technosphere-uuid]')?.dataset?.technosphereUuid);

		if (event.button === 0) {
			if (technosphere) {
				return technosphere.sheet.render({ force: true });
			}
		}

		if (event.button === 2) {
			if (item && technosphere) {
				if (item.type === 'mnemosphereReceptacle') {
					return item.system.removeMnemosphere(technosphere);
				}

				if (['customWeapon', 'armor'].includes(item.type)) {
					return item.system.removeTechnosphere(technosphere);
				}
			}
		}
	}

	static #canDrop() {
		return this.application.isEditable;
	}

	static async #onDrop(dragEvent) {
		const eventData = TextEditor.getDragEventData(dragEvent);

		if (eventData.type === 'Item') {
			dragEvent.preventDefault();
			dragEvent.stopPropagation();

			const item = await fromUuid(dragEvent.target.closest('[data-uuid]')?.dataset?.uuid);
			if (item) {
				const droppedItem = await fromUuid(eventData.uuid);
				if (item.type === 'mnemosphereReceptacle') {
					return item.system.slotMnemosphere(droppedItem);
				}

				if (['customWeapon', 'armor'].includes(item.type)) {
					return item.system.slotTechnosphere(droppedItem);
				}
			}
		}
	}
}
