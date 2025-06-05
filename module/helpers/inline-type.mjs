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
	// (all|attack|skill|spell), (all|fire|ice|...), (priority|normal)?
	damage: [],
	// (fire|...), (resistance|vulnerability|normal...)
	affinity: [],
};

/**
 * @type {TextEditorEnricherConfig}
 */
const editorEnricher = {
	id: 'InlineTypeEnricher',
	pattern: InlineHelper.compose('TYPE', `(?<type>\\w+)(?<args>(\\s+([a-zA-Z0]+))+)s*`, InlineEffects.configurationPropertyGroups),
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
				const damageTypes = parseDamageTypes(split[0]);
				if (damageTypes.length === 0) {
					return null;
				}
				const affinityType = split[1];
				if (!(affinityType in FU.affValue)) {
					return null;
				}
				// TOOLTIP
				anchor.setAttribute('data-tooltip', `${game.i18n.localize('FU.InlineAffinity')} (${damageTypes})`);
				// LABEL
				if (label) {
					anchor.append(label);
				} else {
					const localizedAffinity = game.i18n.localize(FU.affType[FU.affValue[affinityType]]);
					const localizedTypes = split[0] === 'all' ? game.i18n.localize('FU.All') : damageTypes.map((t) => game.i18n.localize(FU.damageTypes[t])).join(' ');
					anchor.append(`${localizedAffinity} (${localizedTypes})`);
				}
				// ICON
				const icon = document.createElement('i');
				icon.className = damageTypes.length > 1 ? FU.allIcon.diamond : FU.affIcon[damageTypes[0]];
				anchor.append(icon);
				return anchor;
			}
		}

		return null;
	},
	onRender: onRender,
};

/**
 * @param {HTMLElement} element
 * @returns {Promise<void>}
 */
async function onRender(element) {
	const renderContext = await InlineHelper.getRenderContext(element);

	// Click handler
	element.addEventListener('click', async function () {
		const targets = await targetHandler();
		if (targets.length > 0) {
			const type = renderContext.dataset.type;
			const args = renderContext.dataset.args;
			const config = InlineHelper.fromBase64(renderContext.dataset.config);

			for (const target of targets) {
				await applyEffect(target, renderContext.sourceInfo, type, args, config);
			}
		}
	});

	// Drag handler
	element.addEventListener('dragstart', function (event) {
		if (!event.dataTransfer) {
			return;
		}

		const data = {
			dataType: INLINE_TYPE,
			sourceInfo: renderContext.sourceInfo,
			config: InlineHelper.fromBase64(renderContext.dataset.config),
			type: renderContext.dataset.type,
			args: renderContext.dataset.args,
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

// AFFINITY
const elementRegex = /(?<type>\w+)/g;

/**
 * @param {String} parse
 * @returns {String[]}
 */
function parseDamageTypes(parse) {
	if (parse === 'all') {
		return Object.keys(FU.affIcon);
	}
	return [...parse.matchAll(elementRegex)].map((e) => {
		return e.groups.type;
	});
}

/**
 * @param {String} type
 * @param {String[]} args
 * @returns {ActiveEffectData}
 */
function composeEffectData(type, args) {
	let attributeKey;
	let attributeValue;
	let name;
	let img;
	let changes = [];

	switch (type) {
		// damage (all|attack|skill|spell), (all|fire|ice|...), (priority|normal)?
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
				changes = [
					{
						key: attributeKey,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: attributeValue,
					},
				];
			}
			break;

		// affinity (all|fire|...), (resistance|vulnerability|normal...)
		case 'affinity':
			{
				const includeAll = args[0] === 'all';
				const damageTypes = parseDamageTypes(args[0]);
				const affinity = args[1];
				let localizedTypes = [];
				if (includeAll) {
					localizedTypes.push(game.i18n.localize('FU.All'));
				}

				attributeValue = FU.affValue[affinity];
				const localizedAffinity = game.i18n.localize(FU.affType[attributeValue]);

				for (const type of damageTypes) {
					attributeKey = `system.affinities.${type}.current`;
					const localizedType = game.i18n.localize(FU.damageTypes[type]);
					if (!includeAll) {
						localizedTypes.push(localizedType);
					}
					changes.push({
						key: attributeKey,
						mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						value: attributeValue,
					});
				}

				name = `${localizedAffinity} (${localizedTypes.join(' ')})`;
				if (damageTypes.length > 1) {
					img = `systems/projectfu/styles/static/icons/fus-martial.svg`;
				} else {
					img = `systems/projectfu/styles/static/affinities/${damageTypes[0]}.svg`;
				}
			}
			break;
	}

	return {
		name: name,
		img: img,
		transfer: false,
		changes: changes,
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
		const effectData = composeEffectData(type, args.split(' '));
		Effects.onApplyEffectToActor(actor, effectData, sourceInfo, config).then((effect) => {
			console.info(`Created effect: ${effect.uuid} on actor uuid: ${actor.uuid}`);
		});
	} else {
		ui.notifications.error('FU.ChatApplyNoCharacterSelected', { localize: true });
	}
}

/**
 * @type {FUInlineCommand}
 */
export const InlineType = {
	enrichers: [editorEnricher],
	onDropActor,
};
