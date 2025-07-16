import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { FU } from '../helpers/config.mjs';
import { ActorSheetUtils } from '../sheets/actor-sheet-utils.mjs';
import FUApplication from './application.mjs';

/**
 * @typedef NpcProfileRevealData
 * @property {Map<String, Number>} affinities
 * @property {String[]} traits
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
		options.title = data.name;
		super(data, options);
		this.data = data;
		this._expanded = new Set();
	}

	/** @inheritdoc
	 * @override
	 * */
	_initializeApplicationOptions(options) {
		return super._initializeApplicationOptions(options);
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		classes: ['actor', 'npc-profile'],
		resizable: true,
		title: 'NPC Profile',
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

	/** @override */
	async _prepareContext(options) {
		let context = await super._prepareContext(options);

		/** @type FUActor **/
		const actor = await fromUuid(this.data.uuid);
		/** @type NpcDataModel  **/
		const system = actor.system;
		const result = StudyRollHandler.resolveStudyResult(this.data.study);
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
		const hasRevealedData = !!this.data.revealed;
		// Stats
		const revealStats = basic || !!this.data.revealed.traits;
		// Affinities
		const revealAffinities = (hasRevealedData && !!this.data.revealed.affinities) || complete;
		const affinities = Object.entries(system.affinities).map(([affinity, values]) => {
			const reveal = complete || (revealAffinities && affinity in (this.data.revealed?.affinities ?? {}));
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

		Object.assign(context, this.data);
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
		context.level = system.level.value;
		context.hp = system.resources.hp.max;
		context.mp = system.resources.mp.max;
		context.localizedSpecies = FU.species[this.data.species];

		// Ensure expanded state is initialized
		context._expandedIds = Array.from(this._expanded);
		await ActorSheetUtils.prepareItems(context);
		return context;
	}

	/**
	 * @inheritDoc
	 * @override
	 */
	_attachFrameListeners() {
		super._attachFrameListeners();
		ActorSheetUtils.activateExpandedItemListener(this.element, this._expanded);
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
	 * @param {PartyDataModel} party
	 * @param {String} uuid
	 * @returns {Promise<void>}
	 */
	static async updateNpcProfile(party, uuid) {
		const existing = await party.getAdversary(uuid);

		/** @type FUActor **/
		const actor = await fromUuid(existing.uuid);
		const studyDifficulties = StudyRollHandler.getStudyDifficulties();
		const affinities = Object.keys(FU.damageTypes);
		const affinityMap = Object.fromEntries(Object.entries(actor.system.affinities).map(([key, aff]) => [key, FU.affTypeAbbr[aff.current]]));
		/** @type String **/
		const traits = actor.system.traits.value;
		const traitsArray = traits
			.trim()
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		console.debug(`Editing profile of ${JSON.stringify(existing)}`);

		let updatedProfile = await foundry.applications.api.DialogV2.input({
			window: { title: game.i18n.localize('FU.NpcProfileUpdate') },
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/ui/study/npc-profile-edit.hbs', {
				existing: existing,
				studyDifficulties: studyDifficulties,
				affinities: affinities,
				affinityMap: affinityMap,
				traits: traitsArray,
			}),
			render: (event, dialog) => {
				const studyValueDisplay = dialog.element.querySelector('#study-value');
				const studyValueInput = dialog.element.querySelector('[name=study]');
				studyValueInput.addEventListener('change', (e) => {
					studyValueDisplay.textContent = studyValueInput.value;
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
				const affinityValue = foundry.utils.getProperty(updatedProfile, `affinities.${aff}`);
				if (affinityValue === true) {
					existing.revealed.affinities ??= {};
					existing.revealed.affinities[aff] = true;
				} else if (affinityValue === false) {
					delete existing.revealed?.affinities?.[aff];
				}
			}
			if (existing.revealed.affinities && Object.keys(existing.revealed.affinities).length === 0) {
				delete existing.revealed.affinities;
			}

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
		}
	}
}
