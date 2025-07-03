/**
 * @typedef PartyCharacterData
 * @property {FUActor} actor
 * @property {String} name
 * @property {Number} level
 * @property {PartyCharacterClass} classes
 * @property {PartyCharacterResource[]} resources
 * @property {Number} fp
 * @property {Number} zenit
 * @property {String} role
 * @property {String} statusClass Optional class to be added
 */

/**
 * @typedef PartyCompanionData
 * @property {FUActor} actor
 * @property {String} name
 */

/**
 * @typedef PartyCharacterClass
 * @property {String} name
 * @property {String} fuid
 * @property {String} img
 */

/**
 * @typedef PartyCharacterResource
 * @property {String} name
 * @property {String} label
 * @property {String} icon
 * @property {Number} current
 * @property {Number} max
 * @property {Number} percentage
 */

/**
 * @typedef PartyExperienceData
 * @property {Number} base The base amount of experience per session
 * @property {Number} fp The amount of fabula points spent
 * @property {Number} up The amount of ultima points spent
 * @property {Number} fxp The xp to award based on the number of fabula points divided by number of characters
 * @property {Number} total Total amount of XP to award per character
 */

import { FU, SYSTEM } from '../../../helpers/config.mjs';
import { ProgressDataModel } from '../../items/common/progress-data-model.mjs';
import { SETTINGS } from '../../../settings.js';
import { StudyRollHandler } from '../../../pipelines/study-roll.mjs';
import { StringUtils } from '../../../helpers/string-utils.mjs';

/**
 * @description Represents a party of characters, as well as their management
 * @property {Set<String>} characters The uuids of the actors in the party
 * @property {Set<String>} companions The uuids of companions in the party
 * @property {Array<NpcProfileData>} adversaries The uuids of hostile NPC the party has encountered
 * @property {FUActor} parent
 * @property {Number} resources.zenit.value
 * @property {ProgressDataModel[]} tracks
 */
export class PartyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { HTMLField, StringField, SetField, DocumentUUIDField, ObjectField, NumberField, SchemaField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return {
			// TODO: Probably won't be used
			description: new HTMLField(),
			tracks: new ArrayField(new EmbeddedDataField(ProgressDataModel, {})),
			notes: new HTMLField(),
			groupType: new StringField(),
			characters: new SetField(new DocumentUUIDField({ nullable: true, fieldType: 'Actor' })),
			companions: new SetField(new DocumentUUIDField({ nullable: true, fieldType: 'Actor' })),
			adversaries: new ArrayField(
				new SchemaField({
					uuid: new DocumentUUIDField({ type: 'Actor' }),
					study: new NumberField(),
					name: new StringField(),
					img: new StringField(),
					rank: new StringField(),
					species: new StringField(),
					revealed: new ObjectField(),
				}),
			),
			resources: new SchemaField({
				zenit: new SchemaField({ value: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }) }),
			}),
		};
	}

	/**
	 * @inheritdoc
	 * @remarks Forces the data model to be linked
	 * */
	async _preCreate(data, options, user) {
		const allowed = await super._preCreate(data, options, user);
		if (allowed === false) return false;

		this.parent.updateSource({
			prototypeToken: {
				actorLink: true,
				disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
				sight: {
					enabled: true,
				},
			},
		});

		if (this.parent.type === 'party' && !data.permission) {
			this.parent.updateSource({
				ownership: {
					default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
				},
			});
		}
	}

	/**
	 * @override
	 */
	prepareDerivedData() {}

	/**
	 * @return {Promise<FUActor[]>}
	 */
	async getCharacterActors() {
		return this.getActors('characters');
	}

	/**
	 * @param {String} propertyPath
	 * @returns {Promise<FUActor[]>}
	 */
	async getActors(propertyPath) {
		const actorIds = this[propertyPath];
		let deletedActorIds = [];

		let actors = [];
		for (const id of [...actorIds]) {
			const actor = await fromUuid(id);
			if (!actor) {
				deletedActorIds.push(id);
			}
			actors.push(actor);
		}

		// If any actors were deleted, we must remove them from here as well
		if (deletedActorIds.length > 0) {
			deletedActorIds.forEach((id) => actorIds.delete(id));
			this.parent.update({ [`system.${propertyPath}`]: actorIds });
			actors = actors.filter(Boolean);
		}

		return actors;
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Promise<void>}
	 */
	async addCharacter(actor) {
		if (actor.type !== 'character') {
			console.warn(`${actor.name} is not a player character!`);
			return;
		}

		const characters = this.characters;
		characters.add(actor.uuid);
		await this.parent.update({ ['system.characters']: characters });
		console.debug(`${actor.name} was added to the party`);
	}

	/**
	 * @param {String} id
	 */
	removeCharacter(id) {
		const current = this.characters;
		current.delete(id);
		this.parent.update({ [`system.characters`]: current });
		console.debug(`${id} was removed from the party sheet`);
	}

	/**
	 * @return {Promise<PartyCharacterData[]>}
	 */
	async getCharacterData() {
		const actors = await this.getCharacterActors();
		return actors.map((actor) => {
			/** @type PartyCharacterClass **/
			const classes = actor.items
				.filter((item) => item.type === 'class')
				.map((item) => {
					return {
						name: item.name,
						fuid: item.system.fuid,
						img: item.img,
					};
				});

			const hp = getResourceData(actor, 'hp');
			const mp = getResourceData(actor, 'mp');
			const ip = getResourceData(actor, 'ip');
			let statusClass = undefined;
			if (actor.system.resources.exp.value >= 10) {
				statusClass = 'level-up';
			}
			let identity = actor.system.resources.identity.name;
			if (!identity) {
				identity = StringUtils.localize('FU.Adventurer');
			}

			// Truncate the name
			const name = actor.name.split(' ')[0];

			return {
				actor: actor,
				name: name,
				level: actor.system.level.value,
				identity: identity,
				classes: classes,
				resources: [hp, mp, ip],
				fp: actor.system.resources.fp.value,
				zenit: actor.system.resources.zenit.value,
				role: deduceCharacterRole(actor, classes),
				statusClass: statusClass,
			};
		});
	}

	/**
	 * @param {FUActor} actor
	 * @param {Number} studyResult
	 * @returns {Promise<NpcProfileData>}
	 */
	async addOrUpdateAdversary(actor, studyResult) {
		// Resolve the source actor uuid
		let uuid = actor.resolveUuid();
		// Already exists
		let entry = await this.getAdversary(uuid);
		if (entry) {
			if (studyResult > entry.study) {
				entry.study = studyResult;
				await this.updateAdversary(entry);
			}
			return entry;
		}

		entry = /** @type NpcProfileData **/ {
			uuid: uuid,
			name: actor.name,
			img: actor.img,
			rank: actor.system.rank.value,
			species: actor.system.species.value,
			study: studyResult,
		};
		const adversaries = this.adversaries;
		adversaries.push(entry);
		await this.parent.update({ ['system.adversaries']: adversaries });
		console.debug(`${actor.name} was registered as an adversary`);
		return entry;
	}

	/**
	 * @param {NpcProfileData} existing
	 * @returns {Promise<>} True if it was updated
	 */
	async updateAdversary(existing) {
		const adversaries = this.adversaries;
		await this.parent.update({ ['system.adversaries']: adversaries });
		//ui.notifications.info(`Updated information for adversary ${existing.name}`);
		console.debug(`${existing.name} was updated: ${JSON.stringify(existing)}`);
	}

	/**
	 * @param {String} id
	 */
	removeAdversary(id) {
		let current = this.adversaries;
		current = current.filter((a) => a.uuid !== id);
		this.parent.update({ [`system.adversaries`]: current });
	}

	/**
	 * @param {String} uuid
	 * @returns {Promise<NpcProfileData>}
	 */
	async getAdversary(uuid) {
		return this.adversaries.find((a) => a.uuid === uuid);
	}

	/**
	 * @return {Promise<NpcProfileData[]>}
	 */
	async getAdversaryData() {
		let current = this.adversaries;
		const maxStudyValue = StudyRollHandler.getMaxValue();

		let result = [];
		for (const adversary of current) {
			const studyResult = StudyRollHandler.resolveStudyResult(adversary.study);
			let percent = Math.round(Math.min(1, adversary.study / maxStudyValue) * 100);
			result.push({
				...adversary,
				species: FU.species[adversary.species],
				rank: FU.rank[adversary.rank],
				_rank: adversary.rank,
				studyPercent: percent,
				studyResult: studyResult,
				isRevealed: Object.keys(adversary.revealed).length > 0,
			});
		}

		return result;
	}

	/**
	 * @param {FUActor} actor
	 * @returns {Promise<void>}
	 */
	async addCompanion(actor) {
		const companions = this.companions;
		companions.add(actor.uuid);
		await this.parent.update({ ['system.companions']: companions });
		console.debug(`${actor.name} was added to the party`);
	}

	/**
	 * @param {String} id
	 * @returns {Promise<void>}
	 */
	removeCompanion(id) {
		const companions = this.companions;
		companions.delete(id);
		this.parent.update({ [`system.companions`]: companions });
		console.debug(`${id} was removed from the party sheet`);
	}

	/**
	 * @returns {PartyCompanionData[]}
	 */
	async getCompanionData() {
		const actors = await this.getActors('companions');
		return actors.map((actor) => {
			const hp = getResourceData(actor, 'hp');
			const mp = getResourceData(actor, 'mp');
			let identity;
			const parentActor = actor.system.references.actor;
			if (parentActor) {
				identity = StringUtils.localize('FU.PartyCompanionIdentity', {
					actor: parentActor.name,
				});
			} else {
				identity = StringUtils.localize('FU.Companion');
			}
			return {
				actor: actor,
				name: actor.name,
				img: parentActor ? parentActor.img : '',
				level: actor.system.level.value,
				identity: identity,
				resources: [hp, mp],
			};
		});
	}

	/**
	 * @returns {PartyExperienceData}
	 */
	calculateExperience() {
		const activeCharacters = this.characters;
		const spentFabulaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyFabula);
		const spentUltimaPoints = game.settings.get(SYSTEM, SETTINGS.metaCurrencyUltima);

		const baseExperience = game.settings.get(SYSTEM, SETTINGS.metaCurrencyBaseExperience);
		const fabulaExperience = Math.floor(spentFabulaPoints / Math.max(1, activeCharacters.size));
		const totalXp = baseExperience + spentUltimaPoints + fabulaExperience;

		return {
			base: baseExperience,
			fp: spentFabulaPoints,
			up: spentUltimaPoints,
			fxp: fabulaExperience,
			total: totalXp,
		};
	}

	async distributeExperience() {
		const activeCharacters = await this.getCharacterActors();
		const xp = this.calculateExperience();
		const automaticallyDistributeExp = game.settings.get(SYSTEM, SETTINGS.metaCurrencyAutomaticallyDistributeExp);
		const data = {
			baseExp: xp.base,
			ultimaExp: xp.up,
			spentFabula: xp.fp,
			fabulaExp: xp.fxp,
			totalExp: xp.total,
			activeCharacters: activeCharacters,
			characterSectionTitle: automaticallyDistributeExp ? 'FU.ChatExpAwardExpAwardedTo' : 'FU.ChatExpAwardActiveCharacters',
		};

		/** @type ChatMessageData */
		const messageData = {
			flavor: game.i18n.localize('FU.ChatExpAwardFlavor'),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/chat-exp-award.hbs', data),
		};

		ChatMessage.create(messageData);

		if (automaticallyDistributeExp) {
			Actor.updateDocuments(
				activeCharacters.map((character) => ({
					_id: character.id,
					'system.resources.exp.value': character.system.resources.exp.value + xp.total,
				})),
			);
		}
		const newFabulaValue = game.settings.get(SYSTEM, SETTINGS.metaCurrencyKeepExcessFabula) ? xp.fp % Math.max(1, activeCharacters.length) : 0;
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyFabula, newFabulaValue);
		game.settings.set(SYSTEM, SETTINGS.metaCurrencyUltima, 0);
	}
}

function getResourceData(actor, resource) {
	const name = FU.resourcesAbbr[resource];
	const data = actor.system.resources[resource];
	return {
		name: resource,
		label: game.i18n.localize(name),
		current: data.value,
		icon: FU.resourceIcons[resource],
		max: data.max,
		percentage: (data.value / data.max) * 100,
	};
}

/**
 * @typedef {"tank", "damage", "support", "any"} PartyCharacterRole
 */

const supportClasses = new Set(['merchant', 'loremaster', 'orator', 'spiritist', 'tinkerer', 'support', 'chanter', 'dancer']);
const damageClasses = new Set(['elementalist', 'sharpshooter', 'rogue', 'invoker']);
const tankClasses = new Set(['guardian', 'fury']);

/**
 * @param {FUActor} actor
 * @param {PartyCharacterClass[]} classes
 * @returns {PartyCharacterRole}
 * @remarks This is a crucial procedure.
 */
function deduceCharacterRole(actor, classes) {
	if (classes.length === 0) {
		return 'any';
	}

	let supportCount = 0;
	let damageCount = 0;
	let tankCount = 0;

	for (const c of classes) {
		if (supportClasses.has(c.fuid)) {
			supportCount++;
		} else if (damageClasses.has(c.fuid)) {
			damageCount++;
		} else if (tankClasses.has(c.fuid)) {
			tankCount++;
		}
		// It's all damage in the end
		else {
			damageCount++;
		}
	}

	if (supportCount > 0 && damageCount > 0 && tankCount > 0) {
		return 'any';
	}

	if (tankCount > 0) {
		return 'tank';
	} else if (supportCount > Math.round(damageCount / 2)) {
		return 'support';
	}
	return 'damage';
}
