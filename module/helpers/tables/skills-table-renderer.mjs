import { FUTableRenderer } from './table-renderer.mjs';
import { CommonDescriptions } from './common-descriptions.mjs';
import { CommonColumns } from './common-columns.mjs';
import { FU } from '../config.mjs';
import { systemTemplatePath } from '../system-utils.mjs';
import { ExpressionContext, Expressions } from '../../expressions/expressions.mjs';
import { CompendiumIndex } from '../../ui/compendium/compendium-index.mjs';

export class SkillsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'skills-table',
		getItems: (actor) => actor.itemTypes.skill,
		renderDescription: CommonDescriptions.simpleDescription(),
		columns: {
			name: CommonColumns.itemNameColumn({ headerSpan: 2, renderCaption: SkillsTableRenderer.#renderCaption }),
			resourcePoints: CommonColumns.resourceColumn({
				action: 'updateSkillResource',
				getResource: (item) => (item.system.hasResource.value ? item.system.rp : null),
				increaseAttributes: { 'data-resource-action': 'increment' },
				decreaseAttributes: { 'data-resource-action': 'decrement' },
				layout: 'stacked',
			}),
			level: {
				renderHeader: () => game.i18n.localize('FU.SkillLevel'),
				renderCell: SkillsTableRenderer.#renderLevelCell,
			},
			controls: CommonColumns.itemControlsColumn({ type: 'skill', label: 'FU.Skill' }),
		},
	};

	static async #renderCaption(item) {
		const context = new ExpressionContext(item.actor, item, []);
		const data = {
			FU,
			class: item.system.class.value,
		};

		const foundClass = await SkillsTableRenderer.findMatchingClass(item);
		if (foundClass) {
			data.class = foundClass.name;
		}

		let mainWeapon;
		if ((item.system.useWeapon.accuracy || item.system.useWeapon.damage) && item.actor && item.actor.isCharacterType) {
			const mainHandItem = item.actor.items.get(item.actor.system.equipped.mainHand);
			if (mainHandItem && mainHandItem.type in FU.weaponItemTypes) {
				mainWeapon = mainHandItem;
				data.weapon = mainWeapon.name;
			}
		}

		if (item.system.hasRoll.value) {
			let skillAccuracyBonus = 0;
			if (item.system.accuracy) {
				skillAccuracyBonus = await Expressions.evaluateAsync(item.system.accuracy, context);
			}

			if (item.system.useWeapon.accuracy) {
				data.useWeaponAccuracy = true;
				if (mainWeapon) {
					if (mainWeapon.type === 'weapon') {
						let weaponAccuracyBonus = 0;
						if (mainWeapon.system.accuracy.value) {
							weaponAccuracyBonus = await Expressions.evaluateAsync(mainWeapon.system.accuracy.value, context);
						}
						data.roll = {
							primary: mainWeapon.system.attributes.primary.value,
							secondary: mainWeapon.system.attributes.secondary.value,
							modifier: weaponAccuracyBonus + skillAccuracyBonus,
						};
					}
					if (mainWeapon.type === 'customWeapon') {
						let weaponAccuracyBonus = 0;
						if (mainWeapon.system.accuracy) {
							weaponAccuracyBonus = await Expressions.evaluateAsync(mainWeapon.system.accuracy, context);
						}
						data.roll = {
							primary: mainWeapon.system.attributes.primary,
							secondary: mainWeapon.system.attributes.secondary,
							modifier: weaponAccuracyBonus + skillAccuracyBonus,
						};
					}
				}
			} else {
				data.roll = {
					primary: item.system.attributes.primary,
					secondary: item.system.attributes.secondary,
					modifier: skillAccuracyBonus,
				};
			}
		}

		if (item.system.damage.hasDamage) {
			if (item.system.useWeapon.damage) {
				data.useWeaponDamage = true;
				if (mainWeapon) {
					let weaponDamageValue = 0;
					let weaponDamageType;
					if (mainWeapon.type === 'weapon') {
						if (mainWeapon.system.damage.value) {
							weaponDamageValue = await Expressions.evaluateAsync(mainWeapon.system.damage.value, context);
						}
						weaponDamageType = mainWeapon.system.damageType.value;
					} else if (mainWeapon.type === 'customWeapon') {
						if (mainWeapon.system.damage.value) {
							weaponDamageValue = await Expressions.evaluateAsync(mainWeapon.system.damage.value, context);
						}
						weaponDamageType = mainWeapon.system.damage.type;
					} else {
						throw new Error('Missing weapon damage data. This is a bug, please report it to the maintainers of the system.');
					}

					let itemDamageValue = 0;
					if (item.system.damage.value) {
						itemDamageValue = await Expressions.evaluateAsync(item.system.damage.value, context);
					}
					data.damage = {
						value: itemDamageValue + weaponDamageValue,
						type: item.system.damage.type || weaponDamageType,
						hrZero: item.system.damage.hrZero,
					};
				}
			} else {
				data.damage = {
					value: item.system.damage.value,
					type: item.system.damage.type,
					hrZero: item.system.damage.hrZero,
				};
			}
		}

		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/caption/caption-skill'), data);
	}

	static #renderLevelCell(item) {
		const { value: current, max } = item.system.level;
		const skillArr = Array(max)
			.fill(null)
			.map((value, index) => ({
				level: index + 1,
				reached: current > index,
			}));
		return foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-skill-level'), { skillArr: skillArr });
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
			const classNameSlug = game.projectfu.util.slugify(className);
			const classFoundWithFuid = classes.find((classItem) => {
				return classItem.system?.fuid === classNameSlug;
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
			const foundActorClass = SkillsTableRenderer.findMatchingClassInArray(item, actorClasses);
			if (foundActorClass) {
				return foundActorClass;
			}

			const worldClasses = game.items.filter((arrayItem) => {
				return arrayItem.type === 'class';
			});
			const foundWorldClass = SkillsTableRenderer.findMatchingClassInArray(item, worldClasses);
			if (foundWorldClass) {
				return foundWorldClass;
			}

			const compendiumClasses = await CompendiumIndex.instance.getClasses();
			if (compendiumClasses?.class) {
				const foundCompendiumClass = SkillsTableRenderer.findMatchingClassInArray(item, compendiumClasses.class);
				if (foundCompendiumClass) {
					return foundCompendiumClass;
				}
			}
		}
		return;
	}
}
