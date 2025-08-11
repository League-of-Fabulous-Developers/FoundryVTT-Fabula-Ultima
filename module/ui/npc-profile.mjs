import { StudyRollHandler } from '../pipelines/study-roll.mjs';
import { FU } from '../helpers/config.mjs';
import { ActorSheetUtils } from '../sheets/actor-sheet-utils.mjs';

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
 */
export class NpcProfileWindow extends Application {
	constructor(data = {}, options = {}) {
		options.title = data.name;
		super(data, options);
		this.data = data;
		this._expanded = new Set();
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: 'npc-profile',
			classes: ['projectfu', 'sheet', 'actor', 'npc-profile', 'backgroundstyle'],
			template: 'systems/projectfu/templates/ui/study/npc-profile.hbs',
			width: 730,
			height: 'auto',
			resizable: true,
			title: 'NPC Profile',
		});
	}

	async getData() {
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

		let context = {
			...this.data,
			actor: actor,
			system: system,
			items: actor.items,
			basic: basic,
			complete: complete,
			detailed: detailed,
			affinities: affinities,
			revealStats: revealStats,
			revealAffinities: revealAffinities,
			level: system.level.value,
			hp: system.resources.hp.max,
			mp: system.resources.mp.max,
			localizedSpecies: FU.species[this.data.species],
		};

		// Ensure expanded state is initialized
		context._expandedIds = Array.from(this._expanded);
		await ActorSheetUtils.prepareItems(context);

		return context;
	}

	activateListeners(html) {
		super.activateListeners(html);
		html.find('[data-action=revealActor]').on('click', (ev) => {
			const uuid = this.data.uuid;
			const actor = fromUuidSync(uuid);
			if (actor) {
				actor.sheet.render(true);
			} else {
				ui.notifications.error('The referenced actor is no longer present');
			}
		});
		// Toggle Expandable Item Description
		ActorSheetUtils.activateExpandedItemListener(html, this._expanded);
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
		const maxStudyValue = StudyRollHandler.getMaxValue();
		const affinities = Object.keys(FU.damageTypes);
		const affinityMap = Object.fromEntries(Object.entries(actor.system.affinities).map(([key, aff]) => [key, FU.affTypeAbbr[aff.current]]));
		/** @type String **/
		const traits = actor.system.traits.value;
		const traitsArray = traits.trim().split(',').filter(Boolean);
		console.debug(`Editing profile of ${JSON.stringify(existing)}`);
		new Dialog({
			title: game.i18n.localize('FU.NpcProfileUpdate'),
			content: await renderTemplate('systems/projectfu/templates/ui/study/npc-profile-edit.hbs', {
				existing: existing,
				maxStudyValue: maxStudyValue,
				affinities: affinities,
				affinityMap: affinityMap,
				traits: traitsArray,
			}),
			buttons: [
				{
					label: 'Confirm',
					callback: async (html) => {
						// Study
						const studyStr = html.find('[name="study"]').val();
						const study = Number(studyStr);
						if (study !== existing.study) {
							existing.study = study;
						}

						// Revealed
						const formElem = html.find('form')[0];
						const form = new FormData(formElem);
						existing.revealed ??= {};

						// Affinities
						for (const aff of affinities) {
							if (form.has(`affinities.${aff}`)) {
								existing.revealed.affinities ??= {};
								existing.revealed.affinities[aff] = true;
							} else {
								if (existing.revealed?.affinities?.[aff]) {
									delete existing.revealed.affinities[aff];
								}
							}
						}
						if (existing.revealed.affinities && Object.keys(existing.revealed.affinities).length === 0) {
							delete existing.revealed.affinities;
						}

						// Traits
						const data = Object.fromEntries(form.entries());
						const traits = Object.entries(data)
							.filter(([key, value]) => key.startsWith('traits.') && value === 'on')
							.map(([key]) => key.replace('traits.', ''));
						if (traits.length > 0) {
							existing.revealed.traits = traits;
						} else {
							if (existing.revealed.traits) {
								delete existing.revealed.traits;
							}
						}

						await party.updateAdversary(existing);
					},
				},
				{
					label: 'Cancel',
					callback: () => {},
				},
			],
		}).render(true);
	}
}
