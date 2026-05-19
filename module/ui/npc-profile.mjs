import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { FU } from '../helpers/config.mjs';
import FUApplication from './application.mjs';
import { NpcProfileBasicAttacksTableRenderer } from '../helpers/tables/npc-profile-basic-attacks-table-renderer.mjs';
import { NpcProfileWeaponsTableRenderer } from '../helpers/tables/npc-profile-weapons-table-renderer.mjs';
import { NpcProfileSpellsTableRenderer } from '../helpers/tables/npc-profile-spells-table-renderer.mjs';
import { getSystemSetting, SETTINGS } from '../settings.js';
import FoundryUtils from '../helpers/foundry-utils.mjs';
import { ActorSheetUtils } from '../sheets/actor-sheet-utils.mjs';
import { NpcProfileAbilitiesTableRenderer } from '../helpers/tables/npc-profile-abilities-table-renderer.mjs';
import { NpcProfileRulesTableRenderer } from '../helpers/tables/npc-profile-rules-table-renderer.mjs';

/**
 * @typedef NpcProfileRevealData
 * @property {Map<String, Number>} affinities The currently revealed affinities.
 * @property {Map<String, Boolean>} pressurePoints The currently revealed pressure points.
 * @property {String[]} traits The currently revealed traits.
 */

/**
 * @typedef NpcProfileData
 * @property {String} uuid
 * @property {Number} study
 * @property {String} name
 * @property {String} img
 * @property {String} rank
 * @property {String} species
 * @property {NpcProfileRevealData} revealed
 */

/**
 * @typedef NpcProfileAffinity
 * @property
 */

/**
 * @property {NpcProfileData} data
 * @inheritDoc
 */
export class NpcProfileWindow extends FUApplication {
	constructor(data = {}, options = {}) {
		const actor = fromUuidSync(data.uuid, { strict: true });
		if (actor && actor.apps.npcProfile) {
			return actor.apps.npcProfile;
		}

		options.title = data.name;
		super(options);
		this.data = data;

		if (options.party) {
			this.party = options.party;
			delete options.party;

			this.party.apps[this.id] = this;
		}

		if (actor) {
			actor.apps.npcProfile = this;
		}
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['npc-profile'],
		window: {
			title: 'NPC Profile',
			resizable: true,
		},
		position: { width: 750, height: 'auto' },
		actions: {
			revealActor: this.#revealActor,
		},
	};

	/**
	 * @override
	 */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/ui/study/npc-profile.hbs',
		},
	};

	#basicAttacksTable = new NpcProfileBasicAttacksTableRenderer();
	#weaponsTable = new NpcProfileWeaponsTableRenderer();
	#spellsTable = new NpcProfileSpellsTableRenderer();
	#abilitiesTable = new NpcProfileAbilitiesTableRenderer();
	#rulesTable = new NpcProfileRulesTableRenderer();

	/** @override */
	async _prepareContext(options) {
		let context = await super._prepareContext(options);

		let data = this.data;
		if (this.party) {
			data = this.party.system.adversaries.find((value) => value.uuid === data.uuid);
		}
		/** @type FUActor **/
		const actor = await fromUuid(data.uuid);
		ActorSheetUtils.prepareCharacterData(actor);
		/** @type NpcDataModel  **/
		const system = actor.system;
		const result = StudyRollHandler.resolveStudyResult(data.study);
		let basic = false;
		let complete = false;
		let detailed = false;
		switch (result) {
			case 'basic':
				basic = true;
				break;
			case 'complete':
				basic = true;
				complete = true;
				break;
			case 'detailed':
				basic = true;
				complete = true;
				detailed = true;
				break;
		}
		const hasRevealedData = !!data.revealed;
		// Stats
		const revealStats = basic || !!data.revealed.traits;
		// Affinities
		const revealAffinities = (hasRevealedData && !!data.revealed.affinities) || complete;
		const affinities = Object.entries(system.affinities).map(([affinity, values]) => {
			const reveal = complete || (revealAffinities && affinity in (data.revealed?.affinities ?? {}));
			const value = reveal ? values.current : 0;
			const acronymValue = FU.affTypeAbbr[value];
			const fullName = FU.damageTypes[affinity];
			const iconClass = FU.affIcon[affinity];
			const opacity = reveal ? '1' : '0.25';
			return {
				fullName,
				iconClass,
				acronymValue,
				opacity,
			};
		});
		// Pressure Points
		const revealPressurePoints = getSystemSetting(SETTINGS.pressureSystem);
		const pressurePoints = complete ? NpcProfileWindow.getPressurePointMap(actor) : data.revealed.pressurePoints;

		Object.assign(context, data);
		context.actor = actor;
		context.name = actor.name;
		context.img = actor.img;
		context.system = system;
		context.items = actor.items;
		context.basic = basic;
		context.complete = complete;
		context.detailed = detailed;
		context.affinities = affinities;
		context.revealStats = revealStats;
		context.revealAffinities = revealAffinities;
		context.revealPressurePoints = revealPressurePoints;
		context.pressurePoints = pressurePoints;
		context.level = system.level.value;
		context.hp = system.resources.hp.max;
		context.mp = system.resources.mp.max;
		context.localizedSpecies = FU.species[data.species];
		context.statusEffects = FU.statusEffects;
		context.statusImmunities = Object.entries(actor.system.immunities)
			.filter(([, immune]) => immune)
			.filter(([status]) => data.revealed?.statusImmunities[status])
			.map(([status]) => status);

		context.basicAttacksTable = await this.#basicAttacksTable.renderTable(actor);
		context.weaponsTable = await this.#weaponsTable.renderTable(actor);
		context.spellsTable = await this.#spellsTable.renderTable(actor);
		context.abilitiesTable = await this.#abilitiesTable.renderTable(actor, { revealed: data.revealed.abilities });
		context.rulesTable = await this.#rulesTable.renderTable(actor, { revealed: data.revealed.rules });
		context.weaponCategories = FU.weaponCategories;
		return context;
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);
		this.#basicAttacksTable.activateListeners(this);
		this.#weaponsTable.activateListeners(this);
		this.#spellsTable.activateListeners(this);
		this.#abilitiesTable.activateListeners(this);
		this.#rulesTable.activateListeners(this);
	}

	async _onClose(options) {
		super._onClose(options);
		const actor = await fromUuid(this.data.uuid);
		if (actor && actor.apps.npcProfile === this) {
			delete actor.apps.npcProfile;
		}
		if (this.party) {
			delete this.party.apps[this.id];
		}
	}

	static async #revealActor() {
		const uuid = this.data.uuid;
		const actor = fromUuidSync(uuid);
		if (actor) {
			actor.sheet.render(true);
		} else {
			ui.notifications.error('The referenced actor is no longer present');
		}
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Record<String, Boolean>}
	 */
	static getPressurePointMap(actor) {
		return Object.fromEntries((actor.system.pressurePoints.values ?? []).map((p) => [p, true]));
	}

	/**
	 * @param {PartyDataModel} party
	 * @param {String} uuid
	 * @param {Boolean} edit
	 * @returns {Promise<void>}
	 */
	static async updateNpcProfile(party, uuid, edit = true) {
		const existing = party.getAdversary(uuid);

		/** @type FUActor **/
		const actor = await fromUuid(existing.uuid);
		const studyDifficulties = StudyRollHandler.getStudyDifficulties();
		const affinities = Object.keys(FU.damageTypes).filter((value) => value !== 'untyped');
		const affinityMap = Object.fromEntries(Object.entries(actor.system.affinities).map(([key, aff]) => [key, FU.affTypeAbbr[aff.current]]));
		/** @type String **/
		const traits = actor.system.traits.value;
		const traitsArray = traits
			.trim()
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		// Pressure Points
		const pressurePoints = NpcProfileWindow.getPressurePointMap(actor);

		if (edit) {
			console.debug(`Editing profile of ${JSON.stringify(existing)}`);
			const statusImmunities = Object.entries(actor.system.immunities)
				.filter(([, value]) => value.base)
				.map(([status]) => status);
			const content = await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/ui/study/npc-profile-edit.hbs', {
				actor,
				existing: existing,
				studyDifficulties: studyDifficulties,
				affinities: affinities,
				affinityMap: affinityMap,
				pressurePoints,
				weaponCategories: FU.weaponCategories,
				traits: traitsArray,
				FU: FU,
				statusImmunities: statusImmunities,
			});
			let updatedProfile = await FoundryUtils.input(game.i18n.localize('FU.NpcProfileUpdate'), content, {
				render: (event, dialog) => {
					// TODO: Have the current badge update?
					//const studyValueDisplay = dialog.element.querySelector('#study-value');
					const studyValueInput = dialog.element.querySelector('[name=study]');
					studyValueInput.addEventListener('change', (e) => {
						studyValueInput.setAttribute('data-tooltip', `${studyValueInput.value}`);
						//studyValueDisplay.textContent = studyValueInput.value;
					});
				},
				rejectClose: false,
				ok: {
					label: 'FU.Confirm',
				},
			});

			if (updatedProfile) {
				updatedProfile = foundry.utils.expandObject(updatedProfile);

				// Study
				const study = Number(updatedProfile.study);
				if (study !== existing.study) {
					existing.study = study;
				}

				// Revealed
				existing.revealed ??= {};

				// Affinities
				for (const aff of affinities) {
					const isRevealed = foundry.utils.getProperty(updatedProfile, `affinities.${aff}`);
					if (isRevealed === true) {
						existing.revealed.affinities ??= {};
						existing.revealed.affinities[aff] = true;
					} else if (isRevealed === false) {
						delete existing.revealed?.affinities?.[aff];
					}
				}
				if (existing.revealed.affinities && Object.keys(existing.revealed.affinities).length === 0) {
					delete existing.revealed.affinities;
				}

				// Pressure Points
				for (const category of Object.keys(FU.weaponCategories)) {
					const isRevealed = foundry.utils.getProperty(updatedProfile, `pressurePoints.${category}`);
					if (isRevealed === true) {
						existing.revealed.pressurePoints ??= {};
						existing.revealed.pressurePoints[category] = true;
					} else if (isRevealed === false) {
						delete existing.revealed?.pressurePoints?.[category];
					}
				}
				if (existing.revealed.pressurePoints && Object.keys(existing.revealed.pressurePoints).length === 0) {
					delete existing.revealed.pressurePoints;
				}

				existing.revealed.abilities = updatedProfile.abilities;
				existing.revealed.rules = updatedProfile.rules;
				existing.revealed.statusImmunities = updatedProfile.statusImmunities;

				// Traits
				const traits = Object.entries(updatedProfile.traits ?? {})
					.filter(([, value]) => value)
					.map(([key]) => key);
				if (traits.length > 0) {
					existing.revealed.traits = traits;
				} else {
					delete existing.revealed.traits;
				}

				await party.updateAdversary(existing);
				ui.notifications.info(`Edited NPC profile of ${actor.name}.`);
			}
		}
		// REFRESH
		else {
			console.debug(`Refreshing profile of ${JSON.stringify(existing)}`);
			existing.revealed ??= {};

			// Affinities — re-sync values for already-revealed keys
			if (existing.revealed.affinities) {
				for (const aff of Object.keys(existing.revealed.affinities)) {
					existing.revealed.affinities[aff] = FU.affTypeAbbr[actor.system.affinities[aff]?.current];
				}
			}
			// Traits — retain only revealed traits that still exist on the actor
			if (existing.revealed.traits) {
				existing.revealed.traits = existing.revealed.traits.filter((t) => traitsArray.includes(t));
				if (existing.revealed.traits.length === 0) {
					delete existing.revealed.traits;
				}
			}
			ui.notifications.info(`Updated NPC profile of ${actor.name}.`);
		}
	}
}
