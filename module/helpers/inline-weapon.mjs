import { FU } from './config.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { ChooseWeaponDialog } from '../documents/items/skill/choose-weapon-dialog.mjs';
import { Effects } from '../pipelines/effects.mjs';
import { WeaponDataModel } from '../documents/items/weapon/weapon-data-model.mjs';
import { ClassFeatureTypeDataModel } from '../documents/items/classFeature/class-feature-type-data-model.mjs';
import { WeaponModuleDataModel } from '../documents/items/classFeature/pilot/weapon-module-data-model.mjs';
import { InlineEffects } from './inline-effects.mjs';

const INLINE_WEAPON = 'InlineWeapon';
const className = `inline-weapon`;

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	pattern: InlineHelper.compose('WEAPON', '(?<choices>(\\s*([a-zA-Z0]+))+)+', InlineEffects.configurationPropertyGroups),
	enricher: (match, options) => {
		const choices = match.groups.choices.split(' ');

		if (choices.every((value) => value in FU.damageTypes || value === 'any')) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.choices = match.groups.choices;

			// ICON
			InlineHelper.appendImageToAnchor(anchor, 'systems/projectfu/styles/static/compendium/classes/elementalist/spells/elemental_weapon.png');

			// TOOLTIP
			anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineWeapon')} (${choices})`);

			// TEXT
			const label = match.groups.label;
			if (label) {
				anchor.dataset.label = label;
				anchor.append(label);
			} else {
				anchor.append(choices.map(InlineHelper.capitalize).join(' '));
			}

			// CONFIG
			const config = InlineEffects.parseConfigData(match);
			anchor.dataset.config = InlineHelper.toBase64(config);
			return anchor;
		}

		return null;
	},
};

/**
 * @param {ClientDocument} document
 * @param {jQuery} html
 */
function activateListeners(document, html) {
	if (document instanceof DocumentSheet) {
		document = document.document;
	}

	html.find(`a.inline.inline-weapon[draggable]`)
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const choices = this.dataset.choices.split(' ');
				const config = InlineHelper.fromBase64(this.dataset.config);
				targets.forEach(async (target) => {
					await applyEffectToWeapon(target, sourceInfo, choices, config);
				});
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const data = {
				type: INLINE_WEAPON,
				sourceInfo: InlineHelper.determineSource(document, this),
				config: InlineHelper.fromBase64(this.dataset.config),
				traits: this.dataset.choices,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

async function onDropActor(actor, sheet, { type, sourceInfo, choices, config, ignore }) {
	if (type === INLINE_WEAPON) {
		sourceInfo = InlineSourceInfo.fromObject(sourceInfo);
		await applyEffectToWeapon(actor, sourceInfo, choices.split(' '), config);
		return false;
	}
}

/**
 * @param {FUItem} weapon
 * @param {String} type
 * @param {String} label
 * @returns {ActiveEffectData}
 */
function createAlterDamageTypeEffect(weapon, type, label) {
	let key = null;
	if (weapon.system instanceof WeaponDataModel) {
		key = 'system.damageType.value';
	} else if (weapon.system instanceof ClassFeatureTypeDataModel && weapon.system.data instanceof WeaponModuleDataModel) {
		key = 'system.data.damage.type';
	}
	const localizedDamageType = game.i18n.localize(`FU.Damage${InlineHelper.capitalize(type)}`);

	return {
		fuid: `alter-damage-type-${type}`,
		name: label ? `${label} (${localizedDamageType})` : game.i18n.format('FU.InlineWeaponActiveEffectName', { damageType: localizedDamageType }),
		img: type === 'untyped' ? 'icons/svg/circle.svg' : `systems/projectfu/styles/static/affinities/${type}.svg`,
		transfer: false,
		changes: key
			? [
					{
						key: key,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: type,
					},
				]
			: [],
	};
}

/**
 * @param {FUActor} actor
 * @param {InlineSourceInfo} sourceInfo
 * @param {string[]} choices *
 * @param {InlineEffectConfiguration} config
 */
async function applyEffectToWeapon(actor, sourceInfo, choices, config) {
	if (actor.system instanceof CharacterDataModel) {
		const source = sourceInfo.resolve();
		const weapon = await ChooseWeaponDialog.prompt(actor, true);
		if (!weapon) {
			ui.notifications.error('FU.AbilityNoWeaponEquipped', { localize: true });
			return;
		}

		const onApply = async (choice) => {
			choice = choice.trim();
			if (choice in FU.damageTypes) {
				const effectData = createAlterDamageTypeEffect(weapon, choice, config.name);
				// The name is modified
				config.name = effectData.name;

				Effects.onApplyEffect(weapon, effectData, sourceInfo, config).then((effect) => {
					console.info(`Created effect: ${effect.uuid} on weapon uuid: ${weapon.uuid}`);
				});
			}
			console.info(`Applied ${choice} from ${sourceInfo.name} to weapon '${weapon.uuid}' on actor '${actor.uuid}' from source ${source?.uuid}`);
		};

		// If there's more than one choice, bring up a dialog
		/** @type String **/
		const isAny = choices[0] === 'any';
		if (choices.length > 1 || isAny) {
			if (isAny) {
				choices = Object.keys(FU.damageTypes);
			}
			new Dialog({
				title: 'Select Damage Type',
				content: `<p>Select the damage type to apply to the weapon</p>`,
				buttons: choices.map((c) => ({
					label: game.i18n.localize(FU.damageTypes[c]),
					callback: () => onApply(c),
				})),
			}).render(true);
		} else {
			onApply(choices[0]);
		}
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

export const InlineWeapon = {
	enricher: editorEnricher,
	activateListeners,
	onDropActor,
};
