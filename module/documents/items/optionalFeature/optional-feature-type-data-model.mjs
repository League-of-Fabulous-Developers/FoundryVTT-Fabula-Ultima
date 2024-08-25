import { OptionalDataField } from './optional-data-field.mjs';
import { RollableOptionalFeatureDataModel } from './optional-feature-data-model.mjs';
import { ChecksV2 } from '../../../checks/checks-v2.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { SYSTEM } from '../../../helpers/config.mjs';
import { SETTINGS } from '../../../settings.js';
import { slugify } from '../../../util.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof OptionalFeatureTypeDataModel) {
		if (item.system.summary.value || item.system.description) {
			sections.push(
				TextEditor.enrichHTML(item.system.description).then((v) => ({
					partial: 'systems/projectfu/templates/chat/partials/chat-item-description.hbs',
					data: {
						collapseDescriptions: game.settings.get(SYSTEM, SETTINGS.collapseDescriptions),
						summary: item.system.summary.value,
						description: v,
					},
				})),
			);
		}
	}
});

export class OptionalFeatureTypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { StringField, SchemaField, BooleanField, NumberField } = foundry.data.fields;
		return {
			fuid: new StringField(),
			summary: new SchemaField({ value: new StringField() }),
			source: new StringField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			cost: new SchemaField({ value: new NumberField({ intial: 0, min: 0, integer: true, nullable: true }) }),
			optionalType: new StringField({
				nullable: false,
				initial: () => Object.keys(CONFIG.FU.optionalFeatureRegistry?.optionals() ?? {})[0],
				choices: () => Object.keys(CONFIG.FU.optionalFeatureRegistry?.optionals() ?? {}),
			}),
			data: new OptionalDataField('optionalType'),
		};
	}

	prepareDerivedData() {
		this.data?.prepareData();
	}

	/**
	 * For default item chat messages to pick up description.
	 * @return {*}
	 */
	get description() {
		return this.data.description;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		if (this.data instanceof RollableOptionalFeatureDataModel) {
			return this.data.constructor.roll(this.data, this.parent, modifiers.shift);
		} else {
			return ChecksV2.display(this.parent.actor, this.parent);
		}
	}

	/**
	 * Renders a dialog to confirm the FUID change and if accepted updates the FUID on the item.
	 * @returns {Promise<string|undefined>} The generated FUID or undefined if no change was made.
	 */
	async regenerateFUID() {
		const html = `
				<div class="warning-message">
				<p>${game.i18n.localize('FU.FUID.ChangeWarning2')}</p>
				<p>${game.i18n.localize('FU.FUID.ChangeWarning3')}</p>
				</div>
				`;

		const confirmation = await Dialog.confirm({
			title: game.i18n.localize('FU.FUID.Regenerate'),
			content: html,
			defaultYes: false,
			options: { classes: ['projectfu', 'unique-dialog', 'backgroundstyle'] },
		});

		if (!confirmation) return;

		const fuid = slugify(this.data.name);
		await this.update({ 'system.fuid': fuid });

		return fuid;
	}
}
