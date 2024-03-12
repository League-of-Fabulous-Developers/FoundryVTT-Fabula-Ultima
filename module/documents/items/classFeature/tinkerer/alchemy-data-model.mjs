import { RollableClassFeatureDataModel } from '../class-feature-data-model.mjs';

const alchemyFlavors = {
	basic: 'FU.ClassFeatureAlchemyBasic',
	advanced: 'FU.ClassFeatureAlchemyAdvanced',
	superior: 'FU.ClassFeatureAlchemySuperior',
};

/**
 * @extends RollableClassFeatureDataModel
 * @property {"basic","advanced","superior"} rank
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
				choices: Object.keys(alchemyFlavors),
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

	static getAdditionalData() {
		return {
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
		html.find('[data-action=addEffect]').click(() =>
			item.update({
				'system.data.config.alwaysAvailableEffects': [...item.system.data.config.alwaysAvailableEffects, game.i18n.localize('FU.ClassFeatureAlchemyAlwaysAvailableEffectNew')],
			}),
		);
		html.find('[data-action=deleteEffect][data-index]').click((event) => {
			const idx = event.currentTarget.dataset.index;
			item.update({ 'system.data.config.alwaysAvailableEffects': item.system.data.config.alwaysAvailableEffects.toSpliced(idx, 1) });
		});
	}

	/**
	 * @param {AlchemyDataModel} model
	 * @return {Promise<void>}
	 */
	static async roll(model) {
		let dice = model.config.ranks.basic.dice;
		let rank = 'basic';
		if (['advanced', 'superior'].includes(model.rank)) {
			const ranks = ['basic', 'advanced'];
			if (model.rank === 'superior') {
				ranks.push('superior');
			}
			rank = await Dialog.prompt({
				title: game.i18n.localize('FU.ClassFeatureAlchemyDialogRankTitle'),
				label: game.i18n.localize('FU.ClassFeatureAlchemyDialogRankLabel'),
				content: `<select name="rank">${ranks.map((value) => `<option value="${value}">${game.i18n.localize(alchemyFlavors[value])}</option>`)}</select>`,
				rejectClose: false,
				callback: (html) => html.find('select[name=rank]').val(),
			});
			dice = model.config.ranks[rank]?.dice;
		}

		if (dice && rank) {
			const speaker = ChatMessage.implementation.getSpeaker({ actor: model.parent.parent.actor });
			const roll = await new Roll(`{${Array(dice).fill('d20').join(', ')}}`).roll();
			if (model.config.targetRollTable && model.config.effectRollTable) {
				const data = {
					rank: alchemyFlavors[rank],
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
					type: CONST.CHAT_MESSAGE_TYPES.ROLL,
					rolls: [roll],
					content: await renderTemplate('systems/projectfu/templates/feature/tinkerer/feature-alchemy-chat-message.hbs', data),
				});
			} else {
				await roll.toMessage({ flavor: game.i18n.localize(alchemyFlavors[rank]), speaker });
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
