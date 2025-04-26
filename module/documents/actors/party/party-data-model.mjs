/**
 * @typedef PartyCharacterData
 * @property {FUActor} actor
 * @property {PartyCharacterClass} classes
 * @property {Number} level
 * @property {PartyCharacterResource[]} resources
 * @property {Number} fp
 * @property {Number} zenit
 * @property {String} role
 * @property {String} statusClass Optional class to be added
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

/**
 * @description Represents a party of characters, as well as their management
 * @property {Set<String>} characters The uuids of the actors in the party
 * @property {FUActor} parent
 * @property {Number} resources.zenit.value
 * @property {ProgressDataModel[]} tracks
 */
export class PartyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { HTMLField, StringField, SetField, DocumentUUIDField, NumberField, SchemaField, ArrayField, EmbeddedDataField } = foundry.data.fields;
		return {
			// TODO: Probably won't be used
			description: new HTMLField(),
			tracks: new ArrayField(new EmbeddedDataField(ProgressDataModel, {})),
			notes: new HTMLField(),
			groupType: new StringField(),
			characters: new SetField(new DocumentUUIDField({ nullable: true, fieldType: 'Actor' })),
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
	 * @return {FUActor[]}
	 * @remarks This validates actors removed outside
	 */
	get characterActors() {
		const characters = this.characters;
		let deletedActorIds = [];

		/** @type {FUActor[]} **/
		let actors = [...characters].map((id) => {
			const actor = fromUuidSync(id);
			if (!actor) {
				deletedActorIds.push(id);
			}
			return actor;
		});

		// If any actors were deleted, we must remove them from ehre as well
		if (deletedActorIds.length > 0) {
			deletedActorIds.forEach((id) => characters.delete(id));
			this.parent.update({ ['system.characters']: characters });
			actors = actors.filter(Boolean);
		}

		return actors;
	}

	/**
	 * @return {PartyCharacterData[]}
	 */
	get characterData() {
		return this.characterActors.map((actor) => {
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

			return {
				actor: actor,
				name: actor.name,
				level: actor.system.level.value,
				identity: actor.system.resources.identity.name,
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
		const activeCharacters = this.characterActors;
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
			content: await renderTemplate('systems/projectfu/templates/chat/chat-exp-award.hbs', data),
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
