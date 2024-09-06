import { FUItem } from '../items/item.mjs';
import { FUHooks } from '../../hooks.mjs';
import { toggleStatusEffect } from '../../helpers/effects.mjs';

/**
 * Extend the base Actor document by defining a custom roll data structure
 * @extends {Actor}
 * @property {CharacterDataModel | NpcDataModel} system
 */
export class FUActor extends Actor {
	/** @override */
	prepareData() {
		// Prepare data for the actor. Calling the super version of this executes
		// the following, in order: data reset (to clear active effects),
		// prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
		// prepareDerivedData().
		super.prepareData();
		Hooks.callAll(FUHooks.DATA_PREPARED_ACTOR, this);
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
		this.items.forEach((item) => item.applyActiveEffects());
	}

	/**
	 * @override
	 */
	toObject() {
		const result = super.toObject();
		result.uuid = this.uuid;
		return result;
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
	_getCharacterRollData() {
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
	_getNpcRollData() {
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

	async _onCreate(createData, options, userId) {
		await super._onCreate(createData, options, userId);

		if (this.type === 'character' || this.type === 'npc') {
			// Load the compendium
			const pack = game.packs.get('projectfu.basic-equipment');
			const content = await pack.getDocuments();

			// Find the item with system.fuid === 'unarmed-strike'
			const unarmedStrikeItem = content.find((item) => foundry.utils.getProperty(item, 'system.fuid') === 'unarmed-strike');

			if (unarmedStrikeItem) {
				// Add the item to the character
				await this.createEmbeddedDocuments('Item', [unarmedStrikeItem.toObject()]);
			}
		}
	}

	async _preUpdate(changed, options, user) {
		const changedHP = changed.system?.resources?.hp;
		const currentHP = this.system.resources.hp;

		if (typeof changedHP?.value === 'number' && currentHP) {
			const hpChange = changedHP.value - currentHP.value;
			const levelChanged = !!changed.system && 'level' in changed.system;
			if (hpChange !== 0 && !levelChanged) {
				options.damageTaken = hpChange * -1;
			}
		}

		await super._preUpdate(changed, options, user);
	}

	async _onUpdate(changed, options, userId) {
		if (options.damageTaken) {
			this.showFloatyText(options.damageTaken);
		}

		const { hp } = this.system?.resources || {};

		if (hp && userId === game.userId) {
			const crisisThreshold = Math.floor(hp.max / 2);
			const shouldBeInCrisis = hp.value <= crisisThreshold;
			const isInCrisis = this.statuses.has('crisis');
			if (shouldBeInCrisis !== isInCrisis) {
				await toggleStatusEffect(this, 'crisis');
			}

			// Handle KO status
			const shouldBeKO = hp.value === 0; // KO when HP is 0
			const isKO = this.statuses.has('ko');
			if (shouldBeKO !== isKO) {
				await toggleStatusEffect(this, 'ko');
			}
		}
		super._onUpdate(changed, options, userId);
	}

	async showFloatyText(input) {
		if (!canvas.scene) {
			return;
		}

		const [token] = this.getActiveTokens();

		if (token && typeof input === 'number') {
			const gridSize = canvas.scene.grid.size;
			const scrollingTextArgs = [
				{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
				Math.abs(input),
				{
					fill: input < 0 ? 'lightgreen' : 'white',
					fontSize: 32,
					stroke: 0x000000,
					strokeThickness: 4,
				},
			];
			await token._animation;
			await canvas.interface?.createScrollingText(...scrollingTextArgs);
		} else {
			const gridSize = canvas.scene.grid.size;
			const scrollingTextArgs = [
				{ x: token.x + gridSize / 2, y: token.y + gridSize - 20 },
				input,
				{
					fill: 'white',
					fontSize: 32,
					stroke: 0x000000,
					strokeThickness: 4,
				},
			];
			await token._animation;
			await canvas.interface?.createScrollingText(...scrollingTextArgs);
		}
	}

	*allApplicableEffects() {
		for (const effect of super.allApplicableEffects()) {
			const applicableTypes = ['armor', 'shield', 'weapon', 'accessory', 'classFeature'];
			const vehicleTypes = ['projectfu.vehicle', 'projectfu.supportModule', 'projectfu.weaponModule', 'projectfu.armorModule'];
			const arcanumTypes = ['projectfu.arcanum', 'projectfu-playtest.arcanum2'];
			const item = effect.parent;

			if (item instanceof FUItem) {
				const itemId = item.id;
				const itemType = item.type;
				const featureType = item.system.featureType;
				const actor = item.actor;

				// Handle weapons and shields if weapons modules are active
				if ((itemType === 'weapon' || itemType === 'shield') && actor?.system.vehicle?.weaponsActive) {
					continue;
				}

				// Handle armor if armor modules are active
				if (itemType === 'armor' && actor?.system.vehicle?.armorActive) {
					continue;
				}
				// Check if the item is one of the applicable types
				if (applicableTypes.includes(itemType)) {
					// Handle class features based on vehicle configuration
					if (itemType === 'classFeature' && vehicleTypes.includes(featureType)) {
						const vehicle = actor?.system?.vehicle;
						const isEmbarked = vehicle?.embarked;
						let itemExistsInVehicle = false;

						if (featureType === 'projectfu.supportModule' && Array.isArray(vehicle?.supports)) {
							itemExistsInVehicle = vehicle.supports.some((support) => support.id === itemId);
						} else if (featureType === 'projectfu.weaponModule' && Array.isArray(vehicle?.weapons)) {
							itemExistsInVehicle = vehicle.weapons.some((weapon) => weapon.id === itemId);
						} else if (featureType === 'projectfu.armorModule') {
							itemExistsInVehicle = vehicle?.armor?.id === itemId;
						} else if (featureType === 'projectfu.vehicle') {
							itemExistsInVehicle = vehicle?.vehicle?.id === itemId;
						}

						// Continue to the next effect if the item shouldn't transfer its effects
						if (!isEmbarked || !itemExistsInVehicle || (item.transferEffects && !item.transferEffects())) {
							// console.log('Skipping effect due to non-embarked status or item not being part of vehicle.');
							continue;
						}
					} else if (itemType === 'classFeature' && arcanumTypes.includes(featureType)) {
						const currentArcanumId = actor?.system.equipped?.arcanum;

						// Check if the item is the currently active arcanum
						if (itemId !== currentArcanumId) {
							continue;
						}
					} else {
						// Handle regular items using the equipped data model
						const equipData = this.system.equipped;
						if (!equipData.transferEffects(itemId)) {
							continue;
						}
					}
				}
			}
			// Yield effect if it passes all checks
			yield effect;
		}
	}

	applyActiveEffects() {
		if (this.system.prepareEmbeddedData instanceof Function) {
			this.system.prepareEmbeddedData();
		}
		return super.applyActiveEffects();
	}

	async gainMetaCurrency() {
		let metaCurrency;
		if (this.type === 'character') {
			metaCurrency = game.i18n.localize('FU.Fabula');
		}
		if (this.type === 'npc' && this.system.villain.value) {
			metaCurrency = game.i18n.localize('FU.Ultima');
		}

		if (metaCurrency) {
			await this.update({
				'system.resources.fp.value': this.system.resources.fp.value + 1,
			});
			/** @type ChatMessageData */
			const chatData = {
				user: game.user.id,
				speaker: ChatMessage.getSpeaker({ actor: this.name }),
				flavor: game.i18n.format('FU.GainMetaCurrencyChatFlavor', { type: metaCurrency }),
				content: game.i18n.format('FU.GainMetaCurrencyChatMessage', { actor: this.name, type: metaCurrency }),
			};
			ChatMessage.create(chatData);
		}
	}

	async spendMetaCurrency() {
		let metaCurrency;
		if (this.type === 'character') {
			metaCurrency = game.i18n.localize('FU.Fabula');
		}
		if (this.type === 'npc' && this.system.villain.value) {
			metaCurrency = game.i18n.localize('FU.Ultima');
		}
		if (metaCurrency && this.system.resources.fp.value > 0) {
			const confirmed = await Dialog.confirm({
				title: game.i18n.format('FU.UseMetaCurrencyDialogTitle', { type: metaCurrency }),
				content: game.i18n.format('FU.UseMetaCurrencyDialogMessage', { type: metaCurrency }),
				options: { classes: ['projectfu', 'unique-dialog', 'dialog-reroll', 'backgroundstyle'] },
				rejectClose: false,
			});
			if (confirmed && this.system.resources.fp.value > 0) {
				/** @type ChatMessageData */
				const data = {
					speaker: ChatMessage.implementation.getSpeaker({ actor: this }),
					flavor: game.i18n.format('FU.UseMetaCurrencyChatFlavor', { type: metaCurrency }),
					content: game.i18n.format('FU.UseMetaCurrencyChatMessage', { actor: this.name, type: metaCurrency }),
				};
				ChatMessage.create(data);
				await this.update({
					'system.resources.fp.value': this.system.resources.fp.value - 1,
				});
			}
		} else {
			ui.notifications.info(game.i18n.format('FU.UseMetaCurrencyNotificationInsufficientPoints', { actor: this.name, type: metaCurrency }));
		}
	}

	/**
	 * Returns an array of items that match a given FUID and optionally an item type
	 * @param {string} fuid - The FUID of the item(s) which you want to retrieve
	 * @param {string} [type] - Optionally, a type name to restrict the search
	 * @returns {Array} - An array containing the found items
	 */
	getItemsByFuid(fuid, type) {
		const fuidFilter = (i) => i.system.fuid === fuid;
		if (!type) return this.items.filter(fuidFilter);
		const itemTypes = this.itemTypes;
		if (!Object.prototype.hasOwnProperty.call(itemTypes, type)) {
			throw new Error(`Type ${type} is invalid!`);
		}
		return itemTypes[type].filter(fuidFilter);
	}

	/**
	 * Fetch an item that matches a given FUID and optionally an item type
	 * @param {string} fuid - The FUID of the item(s) which you want to retrieve
	 * @param {string} [type] - Optionally, a type name to restrict the search
	 * @returns {Object|undefined} - The matching item, or undefined if none was found.
	 */
	getSingleItemByFuid(fuid, type) {
		return this.getItemsByFuid(fuid, type)[0];
	}
}
