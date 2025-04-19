/**
 * @typedef PartyCharacterData
 * @property {FUActor} actor
 * @property {PartyCharacterClass} classes
 * @property {Number} level
 * @property {PartyCharacterResource[]} resources
 * @property {Number} fp
 * @property {Number} zenit
 * @property {String} role
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

import { FU } from '../../../helpers/config.mjs';

/**
 * @description Represents a party of characters, as well as their management
 * @property {Set<String>} characters
 * @property {FUActor} parent
 * @property {Number} resources.zenit.value
 */
export class PartyDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { HTMLField, StringField, SetField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;
		return {
			// TODO: Probably won't be used
			description: new HTMLField(),
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
	 */
	get characterActors() {
		return [...this.characters].map((c) => fromUuidSync(c));
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
			};
		});
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

const supportClasses = new Set(['merchant', 'loremaster', 'orator', 'spiritist', 'tinkerer', 'support', 'chanter', 'dancer']);
const damageClasses = new Set(['elementalist', 'sharpshooter', 'rogue', 'invoker']);
const tankClasses = new Set(['guardian', 'fury']);

/**
 * @param {FUActor} actor
 * @param {PartyCharacterClass[]} classes
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
