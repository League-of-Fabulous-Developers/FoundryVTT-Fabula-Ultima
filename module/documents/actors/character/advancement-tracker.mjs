import { HeroicSkillTraits, SkillTraits } from '../../../pipelines/traits.mjs';
import { ItemSelectionDialog } from '../../../ui/features/item-selection-dialog.mjs';
import { StringUtils } from '../../../helpers/string-utils.mjs';
import { CompendiumIndex } from '../../../ui/compendium/compendium-index.mjs';

const UNMASTERED_CLASS_LIMIT = 3;
const CLASS_SKILL_LIMIT = 10;
const TRACKED_TYPES = new Set(['class', 'skill', 'heroic', 'spell']);
const ADVANCEMENT_LOG_PREFIX = '[AdvancementTracker]';

const CLASS_HP_BENEFITS = 5;
const CLASS_MP_BENEFITS = 5;
const CLASS_IP_BENEFITS = 2;

/**
 * @typedef {'open'|'locked'|'valid'|'invalid'} AdvancementState
 */

/**
 * @typedef AdvancementEntry
 * @property {AdvancementDataModel} data
 * @property {AdvancementState} state
 * @property {String} message Some states provided a specific message to be shown to the user. (Such as errors)
 */

/**
 * @typedef AdvancementClassInfo
 * @property {Number} level
 * @property {String} img
 * @property {String} id
 */

/**
 * @typedef AdvancementBenefits
 * @property {Number} hp
 * @property {Number} mp
 * @property {Number} ip
 * @property {Boolean} martialArmor
 * @property {Boolean} martialMelee
 * @property {Boolean} martialRanged
 * @property {Boolean} martialShield
 * @property {Number} spell The number of spells?
 */

/**
 * @typedef AdvancementCounter
 * @property {Number} current
 * @property {Number} max
 */

/**
 * @typedef AdvancementSkillUpdate
 * @property {FUItem} item
 * @property {Number} currentLevel The current skill level on the item.
 * @property {Number} targetLevel What the skill level should be.
 */

/**
 * @typedef AdvancementNotifications
 * @property {String} icon
 * @property {String} message
 * @property {Number} count
 */

/**
 * @typedef AdvancementSummary
 * @property {Number} level The current character level.
 * @property {AdvancementEntry[]} entries
 * @property {Record<String, AdvancementClassInfo>} classes Class Name : Class Information
 * @property {Record<String, Number>} skillLevels Skill ID : Skill Level
 * @property {Number} unmasteredClasses
 * @property {AdvancementBenefits} benefits
 * @property {Boolean} patched Whether during the summary updates were applied.
 * @property {AdvancementNotifications[]} notifications
 * @property {FUItem[]} trackedItems Items which are currently assigned during advancements.
 * @property {FUItem[]} untrackedItems Items which are currently not being tracked.
 * @property {AdvancementSkillUpdate[]} pendingSkillUpdates
 */

/**
 * @param {AdvancementDataModel} advancement
 */
function getAdvancementIds(advancement) {
	let ids = [];
	ids.push(advancement.class.id, advancement.skill.id);
	for (const [, entry] of Object.entries(advancement.entries)) {
		for (const [key, value] of Object.entries(entry)) {
			if (key === 'id' && typeof value === 'string') {
				ids.push(value);
			} else if (key === 'ids' && Array.isArray(value)) {
				ids.push(...value);
			}
		}
	}
	return [...new Set(ids.filter(Boolean))];
}

/**
 * @desc Handles calculations and synchronizing the character's advancements.
 */
export class AdvancementTracker {
	/** @type {FUActor} **/
	#actor;
	/** @type {CharacterDataModel} **/
	#system;

	constructor(actor) {
		this.#actor = actor;
		this.#system = actor.system;
	}

	get level() {
		return this.#system.level.value;
	}

	/**
	 * @desc Updates advancement entries whenever the actor itself updates, which can include adding/removing items, changing level.
	 * @returns {void}
	 */
	update() {
		const actor = this.#actor;
		const level = this.level;
		console.debug(`${ADVANCEMENT_LOG_PREFIX} Updating ${actor.name} current advancements at ${level}`);
	}

	/**
	 * @param {FUActor} actor
	 * @param {Number} [level] If provided, only include advancements up to this level.
	 * @return {AdvancementDataModel[]}
	 */
	static getRange(actor, level) {
		const advancements = actor.system.advancements;
		return level ? advancements.slice(0, level) : advancements;
	}

	/**
	 * @param {FUActor} actor
	 * @desc Synchronizes the advancement entries to match the character's level.
	 */
	static syncLevel(actor) {
		const advancements = actor.system.advancements;
		const currentLevel = actor.system.level.value;
		const currentLength = advancements.length;

		if (currentLength >= currentLevel) {
			return;
		}

		const newEntries = [...advancements.map((e) => e.toObject()), ...Array.from({ length: currentLevel - currentLength }, () => ({ items: [] }))];

		console.debug(`${ADVANCEMENT_LOG_PREFIX} Updating ${actor.name} advancements to ${newEntries.length}`);
		actor.update({ 'system.advancements': newEntries });
	}

	/**
	 * @param {FUActor} actor
	 * @param {Number} index
	 * @param {function(AdvancementDataModel) : void} configure
	 */
	static async updateEntry(actor, index, configure) {
		const entries = actor.system.advancements.map((e) => e.toObject());
		const entry = entries[index];
		if (!entry) {
			throw new Error(`${ADVANCEMENT_LOG_PREFIX} no entry at index ${index}`);
		}
		configure(entry);
		await actor.update({ 'system.advancements': entries });
	}

	/**
	 * @param {FUActor} actor
	 */
	static async initializeEntries(actor) {
		await actor.update({ 'system.advancements': [] });
	}

	/**
	 * @param {FUActor} actor
	 * @param {AdvancementDataModel[]} advancements
	 * @returns {[AdvancementDataModel[], Boolean]} A copy of the changed advancement's data.
	 */
	static removeUnresolvedItems(actor, advancements) {
		let changed = false;
		advancements = advancements.map((adv) => adv.toObject());
		for (const adv of advancements) {
			if (adv.class.id && !actor.items.has(adv.class.id)) {
				adv.class.id = undefined;
				changed = true;
			}
			if (adv.skill.id && !actor.items.has(adv.skill.id)) {
				adv.skill.id = undefined;
				changed = true;
			}
			if (!adv.skill.id) {
				if (adv.class.locked) {
					adv.class.locked = false;
					changed = true;
				}
			}

			// GENERIC
			for (const [, entry] of Object.entries(adv.entries)) {
				if (typeof entry !== 'object' || entry === null) continue;

				for (const [key, value] of Object.entries(entry)) {
					if (key === 'id' && typeof value === 'string') {
						if (value && !actor.items.has(value)) {
							entry.id = undefined;
							changed = true;
						}
					} else if (key === 'ids' && Array.isArray(value)) {
						const originalCount = value.length;
						entry.ids = value.filter((id) => actor.items.has(id));
						if (entry.ids.length !== originalCount) {
							changed = true;
						}
					}
				}
			}
		}
		return [advancements, changed];
	}

	/**
	 * @param {FUActor} actor
	 * @desc Clean up any items that may not be part of the actor.
	 */
	static trimEntries(actor) {
		const [advancements, changed] = AdvancementTracker.removeUnresolvedItems(actor, actor.system.advancements);
		if (changed) {
			console.debug(`${ADVANCEMENT_LOG_PREFIX} Refreshed item entries for ${actor.name}`);
			actor.update({ 'system.advancements': advancements });
		}
	}

	/**
	 * @param {FUActor} actor
	 * @desc Lock or unlock entries depending on the overall changed state
	 */
	static lockEntries(actor) {
		const summary = AdvancementTracker.evaluate(actor);
		if (summary.patched) {
			console.debug(`${ADVANCEMENT_LOG_PREFIX} Patched advancements for ${actor.name}`);
			const advancements = summary.entries.map((entry) => {
				return entry.data;
			});
			actor.update({ 'system.advancements': advancements });
		}
	}

	/**
	 * @desc Evaluates the character's current advancements
	 * @param {FUActor} actor
	 * @param {Number} targetLevel If not set, will use the highest level.
	 * @returns {AdvancementSummary}
	 */
	static evaluate(actor, targetLevel = undefined) {
		/** @type {CharacterDataModel} **/
		const system = actor.system;
		targetLevel = targetLevel ?? system.level.value;

		/**
		 * @type {Record<string, AdvancementClassInfo>}
		 * @remarks CLASS FUID: LEVEL
		 **/
		let classes = {};
		/**
		 * @type {Record<string, string[]>}
		 * @remarks CLASS FUID: SKILL FUID
		 **/
		let classSkills = {};
		/**
		 * @type {Record<string, Number>}
		 * @remarks SKILL FUID : SKILL SL
		 **/
		let skillLevels = {};
		/**
		 * @type {Set<String>} The ids that have been referenced so far.
		 */
		let ids = new Set();
		/**
		 * @type {number}
		 */
		let unmasteredClasses = 0;
		/** @type {AdvancementBenefits} **/
		let benefits = {
			hp: 0,
			ip: 0,
			mp: 0,
			martialArmor: false,
			martialMelee: false,
			martialRanged: false,
			martialShield: false,
			spell: 0,
		};

		// REQUIREMENTS:
		// 1.) Number of un-mastered classes cannot go above 3.
		// 2.) A class item grants a skill item
		// 3.) Specific skill items grant a spell item

		/** @desc If at any point the previous entry is open, lock the current one. **/
		let lockEntries = false;
		/** @desc If at any point true, then no further classes can be added **/
		let lockClasses = false;
		/** @desc If changes needed to be made **/
		let patched = false;

		/** @type {AdvancementEntry[]} **/
		let entries = [];

		let [advancements] = AdvancementTracker.removeUnresolvedItems(actor, system.advancements);
		advancements = targetLevel ? advancements.slice(0, targetLevel) : advancements;
		for (let i = 0; i < advancements.length; i++) {
			/** @type {AdvancementDataModel} **/
			const data = advancements[i];
			const level = i + 1;

			/** @type {AdvancementState} **/
			let state;
			let message = '';

			if (lockEntries) {
				state = 'locked';
			} else if (unmasteredClasses > UNMASTERED_CLASS_LIMIT) {
				state = 'invalid';
				message = 'FU.AdvancementClassLimit';
			} else if (level === 6 && Object.keys(classes).length === 1) {
				state = 'invalid';
				message = 'FU.AdvancementStartingClassLimit';
			} else {
				let resolvedClass = false;
				let resolvedSkill = false;

				let grantedSpell = false;
				let resolvedSpell = false;

				let grantedExtraSpells = false;
				let resolvedExtraSpells = false;

				let resolvedEntries = true;

				// CLASS
				if (data.class.id) {
					const classItem = actor.items.get(data.class.id);
					const classIdentifier = classItem.system.fuid;

					/** @type ClassDataModel **/
					const classData = classItem.system;
					if (classData.benefits.resources.hp.value) {
						benefits.hp += CLASS_HP_BENEFITS;
					}
					if (classData.benefits.resources.mp.value) {
						benefits.mp += CLASS_MP_BENEFITS;
					}
					if (classData.benefits.resources.ip.value) {
						benefits.ip += CLASS_IP_BENEFITS;
					}
					if (classData.benefits.martials.armor.value) {
						benefits.martialArmor = true;
					}
					if (classData.benefits.martials.melee.value) {
						benefits.martialMelee = true;
					}
					if (classData.benefits.martials.ranged.value) {
						benefits.martialRanged = true;
					}
					if (classData.benefits.martials.shields.value) {
						benefits.martialShield = true;
					}

					resolvedClass = true;
					// TODO: Error if same class added twice?
					classSkills[classIdentifier] = [];
					classes[classIdentifier] = {
						level: 0,
						id: data.class.id,
						img: classItem.img,
					};

					ids.add(data.class.id);
				} else if (lockClasses) {
					data.class.locked = true;
				}

				// SKILL
				if (data.skill.id) {
					const skillIdentifier = data.skill.id;
					const skillItem = actor.items.get(skillIdentifier);
					/** @type SkillDataModel **/
					const skillData = skillItem.system;
					const classIdentifier = CompendiumIndex.getClassRequirements(skillItem);

					if (classIdentifier) {
						if (classSkills[classIdentifier] === undefined) {
							state = 'invalid';
							message = 'FU.AdvancementSkillClassNotFound';
						} else {
							// If a spell is granted
							grantedSpell = skillData.traits.has(SkillTraits.GrantSpell);
							if (grantedSpell) {
								if (data.entries.spell === undefined) {
									data.entries.spell = {
										id: '',
										locked: false,
									};
									patched = true;
								}
							} else {
								if (data.entries.spell) {
									delete data.entries.spell;
									patched = true;
								}
							}

							// A. Add skill for the first time
							if (!skillLevels[skillIdentifier]) {
								classSkills[classIdentifier].push(skillData.fuid);
								skillLevels[skillIdentifier] = 1;
							}
							// B. Mark SL investment
							else {
								skillLevels[skillIdentifier]++;
							}
							classes[classIdentifier].level++;
							resolvedSkill = true;

							// If a heroic is unlocked
							const unlockedHeroic = classes[classIdentifier].level === CLASS_SKILL_LIMIT;
							if (unlockedHeroic) {
								if (data.entries.heroic === undefined) {
									data.entries.heroic = {
										id: '',
										locked: false,
									};
									patched = true;
								}
							} else {
								if (data.entries.heroic) {
									delete data.entries.heroic;
									patched = true;
								}
							}
						}

						ids.add(data.skill.id);
					} else {
						state = 'invalid';
						message = 'FU.AdvancementSkillMissingClass';
					}
				}

				// HEROIC SKILL (OPTIONAL)
				if (data.entries.heroic) {
					if (!data.entries.heroic.locked && !data.entries.heroic.id) {
						resolvedEntries = false;
					} else {
						const heroicItem = actor.items.get(data.entries.heroic.id);
						grantedExtraSpells = heroicItem.system.traits.has(HeroicSkillTraits.GrantExtraSpells);
						if (grantedExtraSpells) {
							if (data.entries.extraSpells === undefined) {
								data.entries.extraSpells = {
									ids: [],
									required: 2,
								};
								patched = true;
							}
						} else {
							if (data.entries.extraSpells) {
								delete data.entries.extraSpells;
								patched = true;
							}
						}
						ids.add(data.entries.heroic.id);
					}
				}

				// EXTRA SPELLS (OPTIONAL)
				if (data.entries.extraSpells) {
					if (!grantedExtraSpells) {
						delete data.entries.extraSpells;
						patched = true;
					} else {
						if (data.entries.extraSpells.ids.length === data.entries.extraSpells.required) {
							if (data.entries.extraSpells.ids.some((id) => ids.has(id))) {
								state = 'invalid';
								message = 'FU.AdvancementTrackerDuplicateEntry';
							} else {
								resolvedExtraSpells = true;
							}
						}
					}
				}

				// SPELL (OPTIONAL)
				if (data.entries.spell && data.entries.spell.id) {
					if (data.entries.spell.locked) {
						state = 'invalid';
						message = 'FU.AdvancementSpellLocked';
					} else if (ids.has(data.entries.spell.id)) {
						state = 'invalid';
						message = 'FU.AdvancementTrackerDuplicateEntry';
					} else {
						if (resolvedSkill) {
							resolvedSpell = true;
							benefits.spell++;
							ids.add(data.entries.spell.id);
						} else {
							state = 'invalid';
							message = 'FU.AdvancementMissingSkill';
						}
					}
				}

				const classValid = resolvedClass ? resolvedSkill : true;
				const skillValid = resolvedSkill;
				const spellValid = grantedSpell ? resolvedSpell : true;
				const extraSpellsValid = grantedExtraSpells ? resolvedExtraSpells : true;

				if (classValid && skillValid && spellValid && resolvedEntries && extraSpellsValid) {
					state = 'valid';
				}
			}

			if (!state) {
				state = 'open';
			}

			entries.push({
				data,
				message,
				state,
			});

			// Start locking subsequent entries
			if (state === 'open' || state === 'invalid') {
				lockEntries = true;
			}

			// Update number of unmastered classes
			unmasteredClasses = Object.values(classes).filter((cl) => cl.level < 10).length;
			lockClasses = unmasteredClasses === UNMASTERED_CLASS_LIMIT;
		}

		// Only return entries up to the current level
		//entries = entries.slice(0, level);

		/** @type AdvancementNotifications[]  **/
		let notifications = [];

		// Let's record items (class, skill, spell) not yet being tracked
		const entryItemIds = new Set(entries.flatMap((adv) => getAdvancementIds(adv.data)));
		const matchingItems = actor.items.filter((item) => TRACKED_TYPES.has(item.type));
		let { trackedItems, untrackedItems } = matchingItems.reduce(
			(acc, item) => {
				acc[entryItemIds.has(item.id) ? 'trackedItems' : 'untrackedItems'].push(item);
				return acc;
			},
			{ trackedItems: [], untrackedItems: [] },
		);
		untrackedItems = untrackedItems.filter((item) => {
			switch (item.type) {
				case 'spell':
					{
						// Make an exception for Chimerist spells
						const classReqs = CompendiumIndex.getClassRequirements(item);
						if (classReqs.includes('chimerist')) {
							return false;
						}
					}
					break;
			}
			return true;
		});
		if (untrackedItems.length > 0) {
			notifications.push({
				icon: 'warning',
				message: `${StringUtils.localize('FU.AdvancementsUntrackedItems')}: [${untrackedItems.map((item) => item.name).join(', ')}]`,
				count: untrackedItems.length,
			});
		}

		// Let's record skills which levels are not synchronized
		/** @type AdvancementSkillUpdate[] **/
		let pendingSkillUpdates = [];
		for (const [skillId, value] of Object.entries(skillLevels)) {
			const item = actor.items.get(skillId);
			if (!item) continue;

			/** @type {SkillDataModel} */
			const itemData = item.system;
			if (itemData.level.value !== value) {
				pendingSkillUpdates.push({
					item,
					currentLevel: itemData.level.value,
					targetLevel: value,
					count: pendingSkillUpdates.length,
				});
			}
		}
		if (pendingSkillUpdates.length > 0) {
			notifications.push({
				icon: 'skill',
				message: `${StringUtils.localize('FU.AdvancementsUnsynchronizedSkills')}: [${pendingSkillUpdates.map((update) => update.item.name).join(', ')}]`,
				count: pendingSkillUpdates.length,
			});
		}

		return {
			targetLevel,
			entries,
			patched,
			benefits,
			notifications,
			classes,
			unmasteredClasses,
			skillLevels,
			classSkills,
			trackedItems,
			untrackedItems,
			pendingSkillUpdates,
		};
	}

	/**
	 * @param {FUActor} actor
	 * @param {Number} [level] If provided, only include advancements up to this level.
	 * @returns {FUItem[]}
	 */
	static getTrackedItems(actor, level) {
		const range = AdvancementTracker.getRange(actor, level);
		const ids = new Set(range.flatMap((adv) => getAdvancementIds(adv)));
		const trackedItemsIds = Array.from(ids);
		return trackedItemsIds.map((id) => actor.items.get(id)).filter(Boolean);
	}

	/**
	 * @desc Synchronizes the skill levels for tracked items on the actor
	 * @param {FUActor} actor
	 */
	static async synchronizeSkillLevels(actor) {
		const summary = AdvancementTracker.evaluate(actor);

		if (!summary.pendingSkillUpdates.length) {
			ui.notifications.warn(StringUtils.localize('FU.AdvancementsSkillsUpToDate'));
			return;
		}

		const items = summary.pendingSkillUpdates.map((u) => u.item);
		const dialog = new ItemSelectionDialog({
			items: items,
			initial: items,
			payload: summary.pendingSkillUpdates,
			columns: [
				{
					label: 'FU.Change',
					getContent: (item) => {
						return `${item.system.level.value} > ${summary.pendingSkillUpdates.find((upd) => upd.item.id === item.id).targetLevel}`;
					},
				},
			],
			style: 'list',
			getDescription: (item) => item.system.description,
			title: 'FU.AdvancementsSkillSynchronization',
		});

		/** @type AdvancementSkillUpdate[] **/
		const result = await dialog.open();
		if (result) {
			await Promise.all(result.map((update) => update.item.update({ 'system.level.value': update.targetLevel })));
			ui.notifications.info(`Synchronized ${result.length} skills.`);
		}
	}

	/**
	 * @desc Removes any items not being tracked by the advancement tracker.
	 * @param {FUActor} actor
	 */
	static async pruneItems(actor) {
		const summary = AdvancementTracker.evaluate(actor);
		const items = summary.untrackedItems;
		if (items.length === 0) {
			return;
		}
		const dialog = new ItemSelectionDialog({
			items: items,
			initial: items,
			style: 'list',
			getDescription: (item) => item.system.description,
			title: 'FU.AdvancementsPruneItems',
		});
		const result = await dialog.open();
		if (result) {
			await actor.deleteEmbeddedDocuments(
				'Item',
				result.map((item) => item.id),
			);
			ui.notifications.info(`Deleted items (${result.length}) from the actor.`);
		}
	}

	/**
	 * @param {FUActor} actor
	 * @param {Number} [level] If provided, only include advancements up to this level.
	 * @returns {AdvancementSkillReference[]}
	 */
	static getSkillAdvancements(actor, level) {
		const range = AdvancementTracker.getRange(actor, level);
		return range.filter((adv) => adv.skill.id && actor.items.has(adv.skill.id)).map((adv) => adv.skill);
	}
}

////////////////////
// ADVANCEMENT HOOKS
////////////////////
// Direct actor updates (system.level, attributes, etc.)
Hooks.on('updateActor', (actor, changes) => {
	if (actor.type !== 'character') return;
	// If the character's level was updated
	if (foundry.utils.hasProperty(changes, 'system.level')) {
		AdvancementTracker.syncLevel(actor);
	}
	// If any advancements were updated
	if (foundry.utils.hasProperty(changes, 'system.advancements')) {
		AdvancementTracker.lockEntries(actor);
	}
});

// Item added to actor
Hooks.on('createItem', (item, options, userId) => {
	const actor = item.parent;
	if (!actor || actor.type !== 'character') return;
	const tracker = new AdvancementTracker(actor);
	tracker.update();
});

// Item removed from actor
Hooks.on('deleteItem', (item, options, userId) => {
	const actor = item.parent;
	if (!actor || actor.type !== 'character') return;
	AdvancementTracker.trimEntries(actor);
});
