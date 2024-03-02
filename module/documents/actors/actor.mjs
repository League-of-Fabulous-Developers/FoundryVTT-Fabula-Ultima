import { statusEffects } from '../../helpers/statuses.mjs';

/**
 * Extend the base Actor document by defining a custom roll data structure
 * @extends {Actor}
 */
export class FUActor extends Actor {
	/** @override */
	prepareData() {
		// Prepare data for the actor. Calling the super version of this executes
		// the following, in order: data reset (to clear active effects),
		// prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
		// prepareDerivedData().
		super.prepareData();
		Hooks.callAll('projectfu.actor.dataPrepared', this);
	}

	async getData(options = {}) {
		const data = await super.getData(options);

		// Add the spTracker data to the actor's data
		data.spTracker = this.spTracker;

		//Add the tlTracker data to the actor's data
		data.tlTracker = this.tlTracker;

		return data;
	}

	/** @override */
	prepareBaseData() {
		// Data modifications in this step occur before processing embedded
		// documents or derived data.
	}

	/**
	 * @override
	 * Augment the basic actor data with additional dynamic data. Typically,
	 * you'll want to handle most of your calculated/derived data in this step.
	 * Data calculated in this step should generally not exist in template.json
	 * (such as ability modifiers rather than ability scores) and should be
	 * available both inside and outside of character sheets (such as if an actor
	 * is queried and has a roll executed directly from it).
	 */
	prepareDerivedData() {
		const actorData = this;
		const systemData = actorData.system;
		const flags = actorData.flags.projectfu || {};

		this._calculateResources(actorData);
		this._calculateAffinities(actorData);
		this._calculateCrafting(actorData);
		this._handleStatusEffects(actorData);
		this._calculateDefenses(actorData);
		this._calculateInitOrInitMod(actorData);
		this._handleCustomWeapon(actorData);

		// Make separate methods for each Actor type (character, npc, etc.) to keep
		// things organized.
		this._prepareCharacterData(actorData);
		this._prepareNpcData(actorData);
	}

	/**
	 * Calculate and update the defenses/magical defenses of an actor based on equipped items and attributes.
	 *
	 * @param {Object} actorData
	 */
	_calculateDefenses(actorData) {
		// Create an array to store equipped items
		const equipped = [];

		// Iterate through each item in actorData
		actorData.items.forEach((item) => {
			// Check if the item is equipped
			if (item.system.isEquipped?.value) {
				equipped.push(item);
			}
		});

		// Find the equipped armor
		const armor = equipped.find((item) => item.type === 'armor');

		// Get the dexterity attribute value
		const dex = actorData.system.attributes.dex.current;

		// Get the key attribute value based on the dropdown selection
		const primaryValue = armor?.system?.attributes?.primary?.value;
		const primaryKey = primaryValue ? actorData.system.attributes[primaryValue]?.current : dex;

		// Calculate the base defense
		const baseDef = armor ? (armor.system.isMartial.value ? armor.system.def.value : armor.system.def.value + primaryKey) : dex;

		// Filter equipped items for shields and accessories
		const otherArmors = equipped.filter((item) => item.type === 'shield' || item.type === 'accessory');

		// Calculate defense from other armors
		const otherDef = otherArmors.reduce((def, item) => {
			def += item.system.def.value;
			return def;
		}, 0);

		// Get bonus defense from derived attributes
		const bonusDef = actorData.system.derived.def.bonus ?? 0;

		// Calculate total defense
		const def = baseDef + otherDef + bonusDef;

		// Filter equipped items for non-weapons: weapons and basic attacks
		const nonWeapons = equipped.filter((item) => item.type !== 'weapon' || item.type !== 'basic');

		// Get the insight attribute value
		const ins = actorData.system.attributes.ins.current;

		// Get the key attribute value based on the dropdown selection
		const secondaryValue = armor?.system?.attributes?.secondary?.value;
		const secondaryKey = secondaryValue ? actorData.system.attributes[secondaryValue]?.current : ins;

		// Calculate defense against magic attacks (magical defense)
		const otherMDef = nonWeapons.reduce((mdef, item) => {
			if (item.system && item.system.mdef) {
				mdef += item.system.mdef.value;
			}
			return mdef;
		}, 0);

		// Get bonus magical defense from derived attributes
		const bonusMDef = actorData.system.derived.mdef.bonus ?? 0;

		// Calculate total magical defense
		const mdef = secondaryKey + otherMDef + bonusMDef;

		// Update derived defense values in actorData
		actorData.system.derived.def.value = def;
		actorData.system.derived.mdef.value = mdef;
	}

	/**
	 * Calculate and update the resource attributes (health points, mind points, inventory points) of an actor based on their attributes, classes, and bonuses.
	 *
	 * @param {Object} actorData - The data object representing an actor in Foundry VTT.
	 */
	_calculateResources(actorData) {
		// Extract system-specific data from actorData.
		const systemData = actorData.system;

		// Filter classes and heroic skills for specific benefits.
		const classes = actorData.items.filter((item) => item.type === 'class');
		const classesWithHp = classes.filter((item) => item.system.benefits.resources.hp.value);
		const classesWithMp = classes.filter((item) => item.system.benefits.resources.mp.value);
		const classesWithIp = classes.filter((item) => item.system.benefits.resources.ip.value);
		const heroics = actorData.items.filter((item) => item.type === 'heroic');
		const heroicSkillWithHp = heroics.filter((item) => item.system.benefits.resources.hp.value);
		const heroicSkillWithMp = heroics.filter((item) => item.system.benefits.resources.mp.value);
		const heroicSkillWithIp = heroics.filter((item) => item.system.benefits.resources.ip.value);

		// Calculate multipliers based on actor type and attributes.
		const hpMultiplier = actorData.type !== 'npc' ? 1 : systemData.isChampion.value !== 1 ? systemData.isChampion.value : systemData.isElite.value ? 2 : 1;
		const mpMultiplier = actorData.type !== 'npc' ? 1 : systemData.isChampion.value !== 1 ? 2 : 1;
		const levelVal = actorData.type === 'npc' ? systemData.level.value * 2 : systemData.level.value;

		if (actorData.type === 'character' || (actorData.type === 'npc' && !systemData.isCompanion.value)) {
			// Calculate maximum health points (hp) based on various factors.
			systemData.resources.hp.max = (systemData.attributes.mig.base * 5 + levelVal + classesWithHp.length * 5 + systemData.resources.hp.bonus) * hpMultiplier;
		} else if (systemData.isCompanion.value) {
			// Calculate maximum health points (hp) for Companion with rounding down
			systemData.resources.hp.max = Math.floor(systemData.attributes.mig.base * systemData.companion.skillLevel) + Math.floor(systemData.companion.playerLevel / 2 + systemData.resources.hp.bonus);
		}

		// Calculate maximum mind points (mp) based on various factors.
		systemData.resources.mp.max = (systemData.attributes.wlp.base * 5 + systemData.level.value + classesWithMp.length * 5 + systemData.resources.mp.bonus) * mpMultiplier;

		// Calculate maximum inventory points (ip) for characters.
		if (actorData.type === 'character') {
			systemData.resources.ip.max = 6 + classesWithIp.length * 2 + systemData.resources.ip.bonus;
		}

		// Apply heroic benefits to maximum hp and mp.
		systemData.resources.hp.max += heroicSkillWithHp.length * (levelVal >= 40 ? 20 : 10);

		systemData.resources.mp.max += heroicSkillWithMp.length * (levelVal >= 40 ? 20 : 10);

		// Apply heroic benefits to maximum ip for characters.
		if (actorData.type === 'character') {
			systemData.resources.ip.max += heroicSkillWithIp.length * 4;
		}
	}

	/**
	 * Calculate and update ritual and project data based on certain factors.
	 * @param {object} actorData - The actor's data object containing items to be processed.
	 */
	_calculateCrafting(actorData) {
		// Define constant objects for various factors
		const constants = {
			potencyMPs: { minor: 20, medium: 30, major: 40, extreme: 50 },
			potencyDLs: { minor: 7, medium: 10, major: 13, extreme: 16 },
			potencyClocks: { minor: 4, medium: 6, major: 6, extreme: 8 },
			areaMPs: { individual: 1, small: 2, large: 3, huge: 4 },
			potencyCosts: { minor: 100, medium: 200, major: 400, extreme: 800 },
			areaCosts: { individual: 1, small: 2, large: 3, huge: 4 },
			usesCosts: { consumable: 1, permanent: 5 },
		};

		// Filter rituals and projects
		const rituals = actorData.items.filter((item) => item.type === 'ritual');
		const projects = actorData.items.filter((item) => item.type === 'project');

		// Function to calculate and update an item's system values
		function calculateAndUpdateItem(item, constants) {
			const { potency, area, mpCost, dLevel, clock } = item.system;

			const potencyVal = potency.value;
			const areaVal = area.value;

			const calcMP = constants.potencyMPs[potencyVal] * constants.areaMPs[areaVal];
			const calcDL = constants.potencyDLs[potencyVal];
			const calcClock = constants.potencyClocks[potencyVal];

			mpCost.value = calcMP;
			dLevel.value = calcDL;
			clock.value = calcClock;
		}

		// Process rituals
		rituals.forEach((ritual) => {
			calculateAndUpdateItem(ritual, constants);
		});

		// Process projects
		projects.forEach((project) => {
			const { potency, area, use, numTinker, numHelper, lvlVision, cost, progress, progressPerDay, days, isFlawed, discount } = project.system;

			const potencyVal = potency.value;
			const areaVal = area.value;
			const usesVal = use.value;

			// Autocalculations
			let discountValue = lvlVision.value * 100;
			const flawedMod = isFlawed.value ? 0.75 : 1;
			const costValue = constants.potencyCosts[potencyVal] * constants.areaCosts[areaVal] * constants.usesCosts[usesVal] * flawedMod;
			const progressValue = Math.max(Math.ceil(costValue / 100), 1);
			const progPDayValue = numTinker.value * 2 + numHelper.value + lvlVision.value;
			const daysValue = Math.ceil(progressValue / progPDayValue);

			// Ensure lvlVision is within the range [0, 5]
			lvlVision.value = Math.min(Math.max(lvlVision.value, 0), 5);

			// Calculate discount.value within the range [0, 500]
			discountValue = Math.min(Math.max(discountValue, 0), 500);

			// Update system values
			discount.value = discountValue;
			cost.value = costValue;
			progress.max = progressValue;
			progressPerDay.value = progPDayValue;
			days.value = daysValue;
		});
	}

	async _calculateAffinities(actorData) {
		const systemData = actorData.system;

		// Initialize an object to store affinities modifiers.
		const statMods = {};

		Object.keys(systemData.affinities).forEach((attrKey) => (statMods[attrKey] = 0));

		// Iterate through each temporary effect applied to the actor.
		actorData.effects.forEach((effect) => {
			// Get the status associated with the effect, if it exists.
			if (effect.statuses.size == 1) {
				const status = CONFIG.statusEffects.find((status) => effect.statuses.has(status));

				// If a valid status is found, apply its modifiers to the corresponding attributes.
				if (status) {
					const stats = status.stats || [];
					const mod = status.mod || 0;

					stats.forEach((attrKey) => (statMods[attrKey] += mod));
				}
			}
		});

		// Update the current affinities value with the calculated new value.
		for (const [key, attr] of Object.entries(systemData.affinities)) {
			let modVal = statMods[key] + attr.bonus;
			let baseVal = attr.base;
			let newVal = baseVal;

			// console.log('Key:', key, ' ModVal:', modVal, ' BaseVal:', baseVal, ' Current:', attr.current);

			if (baseVal === -1 && modVal === 1) {
				newVal = 0;
			} else if (modVal > 0 || modVal < 0) {
				newVal = modVal;
			} else {
				newVal = baseVal += modVal;
			}

			// Ensure newVal is capped between -1 and 4
			newVal = Math.max(-1, Math.min(newVal, 4));

			// Set attr.current directly to newVal
			attr.current = newVal;
		}
	}

	/**
	 * Handles the calculation of attribute modifiers based on applied status effects for an actor.
	 *
	 * @param {object} actorData - The data object representing an actor in Foundry VTT.
	 */
	_handleStatusEffects(actorData) {
		// Extract the system-specific data from actorData.
		const systemData = actorData.system;

		// Initialize an object to store attribute modifiers.
		const statMods = {};

		// Initialize attribute modifiers to 0 for each attribute key.
		Object.keys(systemData.attributes).forEach((attrKey) => (statMods[attrKey] = 0));

		// Iterate through each temporary effect applied to the actor.
		actorData.temporaryEffects.forEach((effect) => {
			// Get the status associated with the effect, if it exists.

			if (effect.statuses.size == 1) {
				const status = CONFIG.statusEffects.find((status) => effect.statuses.has(status.id));

				// If a valid status is found, apply its modifiers to the corresponding attributes.
				if (status) {
					const stats = status.stats || [];
					const mod = status.mod || 0;

					stats.forEach((attrKey) => (statMods[attrKey] += mod));
				}
			}
		});

		// Calculate new attribute values with the applied modifiers.
		for (let [key, attr] of Object.entries(systemData.attributes)) {
			let newVal = attr.base + statMods[key] + attr.bonus;
			if (newVal > 12) {
				newVal = 12;
			}
			if (newVal < 6) {
				newVal = 6;
			}

			// Update the current attribute value with the calculated new value.
			attr.current = newVal;
		}
	}

	_calculateInitOrInitMod(actorData) {
		const equipped = actorData.items.filter((item) => item.system.isEquipped?.value && ['armor', 'shield', 'accessory'].includes(item.type));
		const initMod = equipped.reduce((mod, item) => {
			const itemMod = item.system.init?.value ?? 0;
			return (mod += itemMod);
		}, 0);
		const initBonus = actorData.system.derived.init?.bonus ?? 0;
		const eliteOrChampBonus = actorData.type !== 'npc' ? 0 : actorData.system.isChampion.value !== 1 ? actorData.system.isChampion.value : actorData.system.isElite.value ? 2 : 0;

		actorData.system.derived.init.value = actorData.type === 'npc' ? initMod + (actorData.system.attributes.dex.base + actorData.system.attributes.ins.base) / 2 + initBonus + eliteOrChampBonus : initMod + initBonus;
	}

	_handleCustomWeapon(actorData) {
		// Filter and collect custom weapons
		const customized = actorData.items.filter((item) => (item.type === 'weapon' && item.system.isCustomWeapon?.value) || (item.type === 'basic' && item.system.isCustomWeapon?.value));
		// Update hands.value property for each custom weapon to 'two-handed'
		customized.forEach((customWeapon) => (customWeapon.system.hands.value = 'two-handed'));
		customized.forEach((customWeapon) => (customWeapon.system.cost.value = 300));
	}

	get tlTracker() {
		return this.system.tlTracker;
	}

	get spTracker() {
		return this.system.spTracker;
	}

	/**
	 * Override getRollData() that's supplied to rolls.
	 */
	getRollData() {
		const data = super.getRollData();

		// Prepare character roll data.
		this._getCharacterRollData(data);
		this._getNpcRollData(data);

		return data;
	}

	/**
	 * Prepare character roll data.
	 */
	_getCharacterRollData(data) {
		if (this.type !== 'character') {
		}

		// Copy the ability scores to the top level, so that rolls can use
		// formulas like `@str.mod + 4`.
		// if (data.abilities) {
		//   for (let [k, v] of Object.entries(data.abilities)) {
		//     data[k] = foundry.utils.deepClone(v);
		//   }
		// }

		// Add level for easier access, or fall back to 0.
		// if (data.attributes.level) {
		//   data.lvl = data.attributes.level.value ?? 0;
		// }
	}

	/**
	 * Prepare NPC roll data.
	 */
	_getNpcRollData(data) {
		if (this.type !== 'npc') {
		}

		// Process additional NPC data here.
	}

	async _preCreate(createData, options, user) {
		await super._preCreate(createData, options, user);

		if (this.type === 'character') {
			this.updateSource({
				prototypeToken: {
					actorLink: true,
					disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
				},
			});
		}
	}

	async _preUpdate(changed, options, user) {
		const changedHP = changed.system?.resources?.hp;
		const currentHP = this.system.resources.hp;
		const maxHP = this.system.resources.hp.max;
		const crisis = maxHP / 2;

		if (typeof changedHP?.value === 'number' && currentHP) {
			const hpChange = changedHP.value - currentHP.value;
			const levelChanged = !!changed.system && 'level' in changed.system;
			if (hpChange !== 0 && !levelChanged) options.damageTaken = hpChange * -1;
		}

		await super._preUpdate(changed, options, user);
	}

	_onUpdate(changed, options, userId) {
		if (options.damageTaken) {
			// console.log("Damage taken:", options.damageTaken);
			this.showFloatyText(options.damageTaken);
		}

		const { hp } = this.system?.resources || {};

		if (hp && userId === game.userId) {
			const crisisThreshold = Math.floor(hp.max / 2);
			const inCrisis = hp.value <= crisisThreshold;
			const crisisEffect = this.getEmbeddedCollection('ActiveEffect').contents.find((effect) => effect.name === 'FU.Crisis');

			if (inCrisis && !crisisEffect) {
				this.createEmbeddedDocuments('ActiveEffect', [statusEffects.find((s) => s.id === 'crisis')]);
			} else if (!inCrisis && crisisEffect) {
				this.deleteEmbeddedDocuments('ActiveEffect', [crisisEffect._id]);
			}
		}
		super._onUpdate(changed, options, userId);
	}

	async showFloatyText(input) {
		let scrollingTextArgs;

		if (!canvas.scene) return;

		const gridSize = canvas.scene.grid.size;

		if (_token && typeof input === 'number') {
			scrollingTextArgs = [
				{ x: _token.x + gridSize / 2, y: _token.y + gridSize - 20 },
				Math.abs(input),
				{
					fill: input < 0 ? 'lightgreen' : 'white',
					fontSize: 32,
					stroke: 0x000000,
					strokeThickness: 4,
				},
			];
		}

		if (!scrollingTextArgs) return;

		await _token._animation;
		await canvas.interface?.createScrollingText(...scrollingTextArgs);
	}
}
