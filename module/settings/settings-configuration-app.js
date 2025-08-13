import FUApplication from '../ui/application.mjs';
import { SYSTEM } from '../helpers/config.mjs';

export class SettingsConfigurationApp extends FUApplication {
	/** @type ApplicationConfiguration */
	static DEFAULT_OPTIONS = {
		classes: ['settings-config-app'],
		form: {
			handler: SettingsConfigurationApp.#save,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	/** @type {Record<string, HandlebarsTemplatePart>} */
	static PARTS = {
		main: {
			template: 'systems/projectfu/templates/app/settings/settings-config-app.hbs',
		},
	};

	#settingData = [];

	/**
	 * @param {string[]} settings
	 */
	constructor(settings) {
		super();

		const isGM = game.user.isGM;
		const fields = foundry.data.fields;
		for (let settingKey of settings || []) {
			const settingDocument = game.settings.get(SYSTEM, settingKey, { document: true });
			const setting = game.settings.settings.get(settingDocument.key);

			if (setting.scope === CONST.SETTING_SCOPES.WORLD && !isGM) {
				continue;
			}

			const data = {
				namespace: setting.namespace,
				key: setting.key,
				completeKey: settingDocument.key,
				value: game.settings.get(setting.namespace, setting.key),
				scope: setting.scope,
				requiresReload: setting.requiresReload,
			};
			if (setting.type instanceof fields.DataField) {
				data.field = setting.type;
			} else if (setting.type === Boolean) {
				data.field = new fields.BooleanField({ initial: setting.default ?? false });
			} else if (setting.type === Number) {
				const { min, max, step } = setting.range ?? {};
				data.field = new fields.NumberField({
					required: true,
					choices: setting.choices,
					initial: setting.default,
					min,
					max,
					step,
				});
			} else if (setting.filePicker) {
				throw new Error('SettingsConfigurationApp does not support file pickers');
			} else {
				data.field = new fields.StringField({ required: true, choices: setting.choices });
			}
			data.field.name = settingDocument.key;
			data.field.label ||= game.i18n.localize(setting.name ?? '');
			data.field.hint ||= game.i18n.localize(setting.hint ?? '');

			this.#settingData.push(data);
		}
	}

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		Object.assign(context, {
			settings: this.#settingData,
		});
		return context;
	}

	static async #save(event, form, formData) {
		let requiresClientReload = false;
		let requiresWorldReload = false;

		for (const setting of this.#settingData) {
			const priorValue = game.settings.get(setting.namespace, setting.key, { document: true })._source.value;
			let newValue;
			try {
				const formValue = formData.object[setting.completeKey];
				newValue = await game.settings.set(setting.namespace, setting.key, formValue, { document: true });
			} catch (error) {
				ui.notifications.error(error);
			}
			if (priorValue === newValue) {
				continue;
			} // Compare JSON strings
			requiresClientReload ||= setting.scope !== CONST.SETTING_SCOPES.WORLD && setting.requiresReload;
			requiresWorldReload ||= setting.scope === CONST.SETTING_SCOPES.WORLD && setting.requiresReload;
		}
		if (requiresClientReload || requiresWorldReload) {
			await foundry.applications.settings.SettingsConfig.reloadConfirm({ world: requiresWorldReload });
		}
	}
}
