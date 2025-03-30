import { FU } from './config.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';
import { InlineEffects } from './inline-effects.mjs';

const INLINE_TYPE = 'InlineType';
const className = `inline-type`;

// TODO: Use a nicer data structure
// The comments show the order of `args` property for each type
const supportedTypes = {
	// (all|attack|skill|spell), (fire|ice|...), (priority|normal)?
	damage: [],
	// (fire|...), (resistance|...)
	affinity: [],
};

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	pattern: InlineHelper.compose('TYPE', `\\s*(?<type>\\w+)(?<args>(\\s+\\w+)+)s*`, InlineEffects.configurationPropertyGroups),
	//pattern: /@TYPE\[\s*(?<type>\w+)(?<args>(\s+\w+)+)s*\]/g,
	enricher: (match, options) => {
		const type = match.groups.type.toLowerCase();
		const args = match.groups.args.trimStart();

		if (type && type in supportedTypes) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.type = type;
			anchor.dataset.args = args;

			const config = InlineEffects.parseConfigData(match);
			anchor.dataset.config = InlineHelper.toBase64(config);
			const label = match.groups.label;

			if (type === 'damage') {
				// TOOLTIP
				const damageType = args.split(' ')[1];
				if (!(damageType in FU.damageTypes)) {
					return null;
				}
				anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineAffinity')} (${damageType})`);
				// LABEL ? TYPE
				if (label) {
					anchor.append(label);
				} else {
					const localizedType = game.i18n.localize(FU.damageTypes[damageType]);
					const localizedValue = game.i18n.localize('FU.Damage');
					anchor.append(`${localizedType} ${localizedValue}`);
				}
				// ICON
				const icon = document.createElement('i');
				icon.className = FU.affIcon[damageType] ?? '';
				anchor.append(icon);
				return anchor;
			} else if (type === 'affinity') {
				const split = args.split(' ');
				const damageType = split[0];
				if (!(damageType in FU.damageTypes)) {
					return null;
				}
				const affinityType = split[1];
				if (!(affinityType in FU.affValue)) {
					return null;
				}
				// TOOLTIP
				anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineAffinity')} (${damageType})`);
				// LABEL
				if (label) {
					anchor.append(label);
				} else {
					const localizedType = game.i18n.localize(FU.damageTypes[damageType]);
					const localizedValue = game.i18n.localize(FU.affType[FU.affValue[affinityType]]);
					anchor.append(`${localizedType} ${localizedValue}`);
				}
				// ICON
				const icon = document.createElement('i');
				icon.className = FU.affIcon[damageType] ?? '';
				anchor.append(icon);
				return anchor;
			}
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

	html.find(`a.inline.inline-type[draggable]`)
		.on('click', async function () {
			let targets = await targetHandler();
			if (targets.length > 0) {
				const sourceInfo = InlineHelper.determineSource(document, this);
				const type = this.dataset.type;
				const args = this.dataset.args;
				const config = InlineHelper.fromBase64(this.dataset.config);

				targets.forEach(async (target) => {
					await applyEffect(target, sourceInfo, type, args, config);
				});
			}
		})
		.on('dragstart', function (event) {
			/** @type DragEvent */
			event = event.originalEvent;
			if (!(this instanceof HTMLElement) || !event.dataTransfer) {
				return;
			}

			const sourceInfo = InlineHelper.determineSource(document, this);
			const data = {
				dataType: INLINE_TYPE,
				sourceInfo: sourceInfo,
				config: InlineHelper.fromBase64(this.dataset.config),
				type: this.dataset.type,
				args: this.dataset.args,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

async function onDropActor(actor, sheet, { dataType, sourceInfo, type, args, config, ignore }) {
	if (dataType === INLINE_TYPE) {
		sourceInfo = InlineSourceInfo.fromObject(sourceInfo);
		await applyEffect(actor, sourceInfo, type, args, config);
		return false;
	}
}

/**
 * @param {String} type
 * @param {String[]} args
 * @returns {ActiveEffectData}
 */
function createEffect(type, args) {
	let attributeKey;
	let attributeValue;
	let name;
	let img;

	switch (type) {
		case 'damage':
			{
				const scope = args[0];
				const element = args[1];
				const option = args[2];

				const isPriority = option === 'priority';
				const targetField = isPriority ? 'priority' : 'normal';
				attributeKey = `system.overrides.damageType.${scope}.${targetField}`;
				attributeValue = element;

				const localizedType = game.i18n.localize(FU.damageTypes[element]);
				name = `${localizedType} ${game.i18n.localize('FU.Damage')} [${game.i18n.localize(scope)}]`;
				img = `systems/projectfu/styles/static/affinities/${element}.svg`;
			}
			break;

		case 'affinity':
			{
				const element = args[0];
				const affinity = args[1];

				attributeKey = `system.affinities.${element}.current`;
				const localizedElement = game.i18n.localize(FU.damageTypes[element]);
				attributeValue = FU.affValue[affinity];
				const localizedAffinity = game.i18n.localize(FU.affType[attributeValue]);

				name = `${localizedElement} ${localizedAffinity}`;
				img = `systems/projectfu/styles/static/affinities/${element}.svg`;
			}
			break;
	}

	return {
		name: name,
		img: img,
		transfer: false,
		changes: attributeKey
			? [
					{
						key: attributeKey,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: attributeValue,
					},
				]
			: [],
	};
}

/**
 * @param {FUActor} actor
 * @param {InlineSourceInfo} sourceInfo
 * @param {String} type
 * @param {String} args
 * @param {InlineEffectConfiguration} config
 *
 */
async function applyEffect(actor, sourceInfo, type, args, config) {
	if (actor.system instanceof CharacterDataModel || actor.system instanceof NpcDataModel) {
		//const source = sourceInfo.resolve();
		const effectData = createEffect(type, args.split(' '));
		Effects.onApplyEffectToActor(actor, effectData, sourceInfo, config).then((effect) => {
			console.info(`Created effect: ${effect.uuid} on actor uuid: ${actor.uuid}`);
		});
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

export const InlineType = {
	enricher: editorEnricher,
	activateListeners,
	onDropActor,
};
