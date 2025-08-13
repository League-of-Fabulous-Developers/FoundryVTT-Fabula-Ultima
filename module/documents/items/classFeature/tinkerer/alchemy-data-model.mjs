import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';
import { Flags } from '../../../../helpers/flags.mjs';
import { SYSTEM } from '../../../../helpers/config.mjs';
import { TextEditor } from '../../../../helpers/text-editor.mjs';
import { Checks } from '../../../../checks/checks.mjs';
import { CommonSections } from '../../../../checks/common-sections.mjs';
import { CheckHooks } from '../../../../checks/check-hooks.mjs';

const alchemyRanks = {
	basic: 'FU.ClassFeatureAlchemyBasic',
	advanced: 'FU.ClassFeatureAlchemyAdvanced',
	superior: 'FU.ClassFeatureAlchemySuperior',
};

/**
 * @type {RenderCheckHook}
 */
const onRenderCheck = (sections, check, actor, item) => {
	if (check.type === 'display' && item?.system?.data instanceof AlchemyDataModel) {
		CommonSections.description(sections, item.system.data.description, item.system.summary.value);
	}
};
Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @extends RollableClassFeatureDataModel
 * @property {'basic','advanced','superior'} rank
 * @property {string} description
 * @property {string} basic
 * @property {string} advanced
 * @property {string} superior
 * @property {Object} config
 * @property {RollTable} config.targetRollTable
 * @property {RollTable} config.effectRollTable
 * @property {Object} config.ranks
 * @property {Object} config.ranks.basicInfusions
 * @property {number} config.ranks.basicInfusions.dice
 * @property {number} config.ranks.basicInfusions.cost
 * @property {Object} config.ranks.advancedInfusions
 * @property {number} config.ranks.advancedInfusions.dice
 * @property {number} config.ranks.advancedInfusions.cost
 * @property {Object} config.ranks.superiorInfusions
 * @property {number} config.ranks.superiorInfusions.dice
 * @property {number} config.ranks.superiorInfusions.cost
 */
export class AlchemyDataModel extends RollableClassFeatureDataModel {
	static defineSchema() {
		const { StringField, HTMLField, SchemaField, ArrayField, ForeignDocumentField, NumberField } = foundry.data.fields;
		return {
			rank: new StringField({
				initial: 'basic',
				nullable: false,
				blank: true,
				choices: Object.keys(alchemyRanks),
			}),
			description: new HTMLField(),
			basic: new HTMLField(),
			advanced: new HTMLField(),
			superior: new HTMLField(),
			config: new SchemaField({
				targetRollTable: new ForeignDocumentField(RollTable, { nullable: true }),
				effectRollTable: new ForeignDocumentField(RollTable, { nullable: true }),
				ranks: new SchemaField({
					basic: new SchemaField({
						dice: new NumberField({ initial: 2, min: 1 }),
						cost: new NumberField({ initial: 3, min: 1 }),
					}),
					advanced: new SchemaField({
						dice: new NumberField({ initial: 3, min: 1 }),
						cost: new NumberField({ initial: 4, min: 1 }),
					}),
					superior: new SchemaField({
						dice: new NumberField({ initial: 4, min: 1 }),
						cost: new NumberField({ initial: 5, min: 1 }),
					}),
				}),
				alwaysAvailableEffects: new ArrayField(new StringField()),
			}),
		};
	}

	static get template() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-alchemy-sheet.hbs';
	}

	static get previewTemplate() {
		return 'systems/projectfu/templates/feature/tinkerer/feature-gadgets-preview.hbs';
	}

	static get translation() {
		return 'FU.ClassFeatureAlchemy';
	}

	static async getAdditionalData(model) {
		return {
			enrichedDescription: await TextEditor.enrichHTML(model.description),
			ranks: {
				basic: 'FU.ClassFeatureGadgetsRankBasic',
				advanced: 'FU.ClassFeatureGadgetsRankAdvanced',
				superior: 'FU.ClassFeatureGadgetsRankSuperior',
			},
			rollTables: game.tables.map((table) => ({ id: table.id, name: table.name })),
		};
	}

	/** @override */
	static getTabConfigurations() {
		return [
			{
				group: 'alchemyTabs',
				navSelector: '.alchemy-tabs',
				contentSelector: '.alchemy-content',
				initial: 'description',
			},
		];
	}

	static activateListeners(html, item) {
		const addEffectEl = html.querySelector('[data-action=addEffect]');
		if (addEffectEl) {
			addEffectEl.addEventListener('click', () => {
				item.update({
					'system.data.config.alwaysAvailableEffects': [...item.system.data.config.alwaysAvailableEffects, game.i18n.localize('FU.ClassFeatureAlchemyAlwaysAvailableEffectNew')],
				});
			});
		}

		const deleteEffectEls = html.querySelectorAll('[data-action=deleteEffect][data-index]');
		deleteEffectEls.forEach((el) => {
			el.addEventListener('click', (event) => {
				const idx = Number(event.currentTarget.dataset.index);
				item.update({
					'system.data.config.alwaysAvailableEffects': item.system.data.config.alwaysAvailableEffects.toSpliced(idx, 1),
				});
			});
		});
	}

	/**
	 * @param {AlchemyDataModel} model
	 * @return {Promise<void>}
	 */
	static async roll(model, item, isShift) {
		if (isShift) {
			return Checks.display(item.actor, item);
		}

		let dice = model.config.ranks.basic.dice;
		let rank = 'basic';
		if (['advanced', 'superior'].includes(model.rank)) {
			const ranks = ['basic', 'advanced'];
			if (model.rank === 'superior') {
				ranks.push('superior');
			}
			rank = await foundry.applications.api.DialogV2.prompt({
				window: { title: game.i18n.localize('FU.ClassFeatureAlchemyDialogRankTitle') },
				label: game.i18n.localize('FU.ClassFeatureAlchemyDialogRankLabel'),
				content: `
				<div class="desc">
					<label><strong>${game.i18n.localize('FU.Rank')}</strong></label>:
					<select name="rank">${ranks.map((value) => `<option value="${value}">${game.i18n.localize(alchemyRanks[value])}</option>`)}</select>
				</div>
				`,
				options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
				rejectClose: false,
				ok: { callback: (event, html, dialog) => dialog.element.querySelector('select[name=rank]').value },
			});
			dice = model.config.ranks[rank]?.dice;
		}
		const descriptions = {
			basic: await TextEditor.enrichHTML(model.basic || ''),
			advanced: await TextEditor.enrichHTML(model.advanced || ''),
			superior: await TextEditor.enrichHTML(model.superior || ''),
		};
		if (dice && rank) {
			const speaker = ChatMessage.implementation.getSpeaker({ actor: model.parent.parent.actor });
			const roll = await new Roll(`{${Array(dice).fill('d20').join(', ')}}`).roll();
			const description = descriptions[rank];
			if (model.config.targetRollTable && model.config.effectRollTable) {
				const data = {
					rank: alchemyRanks[rank],
					description: description,
					alwaysAvailableEffects: [...model.config.alwaysAvailableEffects],
					results: [],
				};
				for (const die of roll.dice) {
					const target = model.config.targetRollTable.getResultsForRoll(die.total).at(0).getChatText();
					const effect = model.config.effectRollTable.getResultsForRoll(die.total).at(0).getChatText();
					data.results.push({ result: die.total, target, effect });
				}
				ChatMessage.create({
					speaker,
					type: foundry.utils.isNewerVersion(game.version, '12.0.0') ? undefined : CONST.CHAT_MESSAGE_TYPES.ROLL,
					rolls: [roll],
					content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/feature/tinkerer/feature-alchemy-chat-message.hbs', data),
					flags: { [SYSTEM]: { [Flags.ChatMessage.Item]: item } },
				});
			} else {
				await roll.toMessage({ flavor: game.i18n.localize(alchemyRanks[rank]), speaker });
			}
		}
	}

	static processUpdateData(data) {
		if (data.config.alwaysAvailableEffects && !Array.isArray(data.config.alwaysAvailableEffects)) {
			const effects = [];
			const maxIndex = Object.keys(data.config.alwaysAvailableEffects).length;
			for (let i = 0; i < maxIndex; i++) {
				effects.push(data.config.alwaysAvailableEffects[i]);
			}
			data.config.alwaysAvailableEffects = effects;
		}
	}
}
