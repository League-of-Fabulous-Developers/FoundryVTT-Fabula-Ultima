import { FU } from './config.mjs';
import { InlineHelper, InlineSourceInfo } from './inline-helper.mjs';
import { targetHandler } from './target-handler.mjs';
import { CharacterDataModel } from '../documents/actors/character/character-data-model.mjs';
import { NpcDataModel } from '../documents/actors/npc/npc-data-model.mjs';
import { Effects } from '../pipelines/effects.mjs';

const INLINE_TYPE = 'InlineType';
const className = `inline-type`;

const supportedTypes = {
	// (all|attack|skill|spell), (fire|ice|...), (priority|normal)?
	damage: [],
};

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	pattern: /@TYPE\[\s*(?<type>\w+)(?<args>(\s+\w+)+)s*\]/g,
	enricher: (match, options) => {
		const type = match.groups.type.toLowerCase();
		const args = match.groups.args.trimStart();

		if (type && type in supportedTypes) {
			const anchor = document.createElement('a');
			anchor.classList.add('inline', className);
			anchor.draggable = true;
			anchor.dataset.type = type;
			anchor.dataset.args = args;

			if (type === 'damage') {
				// TOOLTIP
				const damageType = args.split(' ')[1];
				if (!(damageType in FU.damageTypes)) {
					return null;
				}
				anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineAffinity')} (${type})`);
				// TYPE
				const localizedType = game.i18n.localize(FU.damageTypes[damageType]);
				const localizedValue = game.i18n.localize('FU.Damage');
				anchor.append(`${localizedType} ${localizedValue}`);
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

				targets.forEach(async (target) => {
					await applyEffect(target, sourceInfo, type, args);
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
				type: this.dataset.type,
				args: this.dataset.args,
			};
			event.dataTransfer.setData('text/plain', JSON.stringify(data));
			event.stopPropagation();
		});
}

async function onDropActor(actor, sheet, { dataType, sourceInfo, type, args, ignore }) {
	if (dataType === INLINE_TYPE) {
		sourceInfo = InlineSourceInfo.fromObject(sourceInfo);
		await applyEffect(actor, sourceInfo, type, args);
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
 *
 */
async function applyEffect(actor, sourceInfo, type, args) {
	if (actor.system instanceof CharacterDataModel || actor.system instanceof NpcDataModel) {
		//const source = sourceInfo.resolve();
		const effectData = createEffect(type, args.split(' '));
		Effects.onApplyEffectToActor(actor, effectData, sourceInfo).then((effect) => {
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
