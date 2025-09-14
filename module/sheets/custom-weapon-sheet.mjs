import { FU } from '../helpers/config.mjs';
import { TextEditor } from '../helpers/text-editor.mjs';
import { FUItemSheet } from './item-sheet.mjs';

export class CustomWeaponSheet extends FUItemSheet {
	/**
	 * @type {Partial<ApplicationConfiguration>}
	 */
	static DEFAULT_OPTIONS = {
		actions: {
			debug: CustomWeaponSheet.#printDebug,
			changeForm: CustomWeaponSheet.#onChangeForm,
		},
		window: {
			controls: [
				{
					icon: 'fa-bug',
					label: 'Print debug info',
					action: 'debug',
				},
			],
		},
		form: {
			submitOnChange: true,
		},
		classes: [],
		position: {
			width: 700,
		},
	};

	static PARTS = {
		...super.PARTS,
		description: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-description.hbs',
		},
		attributes: {
			template: 'systems/projectfu/templates/item/custom-weapon/custom-weapon-attributes.hbs',
		},
	};

	/** @type {Record<string, ApplicationTabsConfiguration>} */
	static TABS = {
		primary: {
			tabs: [
				{ id: 'description', label: 'FU.Description', icon: 'ra ra-double-team' },
				{ id: 'attributes', label: 'FU.Attributes', icon: 'ra ra-hand' },
				{ id: 'effects', label: 'FU.Effects', icon: 'ra ra-hand' },
			],
			initial: 'description',
		},
		form: {
			tabs: [{ id: 'primaryForm' }, { id: 'secondaryForm' }],
			initial: 'primaryForm',
		},
	};

	static #printDebug() {
		console.log(this);
	}

	static #onChangeForm() {
		const newForm = this.item.system.activeForm === 'primaryForm' ? 'secondaryForm' : 'primaryForm';
		this.item.update({
			'system.activeForm': newForm,
		});
		this.tabGroups.form = newForm;
	}

	constructor(options = {}) {
		super(options);
		this.tabGroups.form = this.item.system.activeForm;
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		const flattenedOverrides = foundry.utils.flattenObject(this.item.system.computedPropertiesSetByActiveEffect);
		Array.from(this.element.querySelectorAll('input[name], textarea[name], button[name], select[name]'))
			.filter((element) => element.name in flattenedOverrides)
			.forEach((element) => this.disableElement(element));
	}

	async _prepareContext(options) {
		if (!this.item.system.isTransforming) {
			this.tabGroups.form = 'primaryForm';
		}

		const context = await super._prepareContext(options);

		const description = await TextEditor.enrichHTML(this.item.system.description);

		context.item = this.item;
		context.system = this.item.system;
		context.enrichedHtml = {
			description,
		};
		context.FU = FU;
		context.tabs = this._prepareTabs('primary');
		context.formTabs = this._prepareTabs('form');

		return context;
	}

	async _preparePartContext(partId, context, options) {
		context = await super._preparePartContext(partId, context, options);
		return context;
	}

	_prepareSubmitData(event, form, formData, updateData) {
		const submitData = super._prepareSubmitData(event, form, formData, updateData);
		const overriddenKeys = Object.keys(foundry.utils.flattenObject(this.item.system.computedPropertiesSetByActiveEffect));
		overriddenKeys.forEach((key) => foundry.utils.deleteProperty(submitData, key));

		if (submitData?.system?.activeForm !== this.item.system.activeForm) {
			this.tabGroups.form = submitData.system.activeForm;
		}

		return submitData;
	}
}
