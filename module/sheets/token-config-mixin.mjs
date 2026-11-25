import { FU } from '../helpers/config.mjs';

const DISPLAY_MODE_FIELDS = ['displayBars', 'displayName'];

export function FUTokenConfigMixin(base) {
	return class FUTokenConfig extends base {
		/**
		 *
		 * @param {string} field
		 */
		_injectDisplayModes(field) {
			const selector = `[name="${field}"]`;
			const select = this.element.querySelector(selector);

			if (select instanceof HTMLSelectElement) {
				Object.entries(FU.tokenDisplayModes).forEach(([key, value]) => {
					const option = document.createElement('option');
					option.value = value;
					option.text = _loc(`FU.TokenDisplayModes.${key}`);

					select.options.add(option);
				});

				if (this._getDisplayModeFlag(field)) select.value = this._getDisplayModeFlag(field);
			} else {
				console.warn(`Could not find element: ${selector}`);
			}
		}

		/**
		 * Sets the flag for PFU-specific display modes
		 * @param {string} field - Name of the field.  Probably displayBars or displayName
		 * @param {any} value - Value to set
		 * @param {object} data - Expanded form data
		 */
		_setDisplayModeFlag(field, value, data) {
			throw new Error(`_setDisplayModeFlag not implemented`);
		}

		/**
		 * Returns the display mode, respecting the PFU-specific settings
		 * @param {string} field - Name of the field.  Probably displayBars or displayName
		 */
		_getDisplayModeFlag(field) {
			throw new Error(`_getDisplayModeFlag not implemented`);
		}

		/**
		 * Returns the display mode configured on this document, ignoring the PFU-specific settings
		 * @param {string} field - Name of the field.  Probably displayBars or displayName
		 */
		_getOriginalDisplayMode(field) {
			throw new Error(`_getOriginalDisplaymode not implemented`);
		}

		_processDisplayModes(field, data) {
			if (data[field] !== undefined && data[field] !== null) {
				// Hacky, but force the field value to be something
				// that's a valid choice in the TokenDocument schema,
				// since we apparently can't actually extend the schema itself
				if (Object.values(FU.tokenDisplayModes).includes(data[field])) {
					const displayValue = data[field];
					data[field] = this._getOriginalDisplayMode(field);
					this._setDisplayModeFlag(field, displayValue, data);
				} else {
					this._setDisplayModeFlag(field, _del, data);
				}
			}
			return data;
		}

		/** @inheritdoc */
		_processFormData(event, form, formData) {
			const data = DISPLAY_MODE_FIELDS.reduce(
				(prev, curr) => {
					return this._processDisplayModes(curr, prev);
				},
				super._processFormData(event, form, formData),
			);

			return data;
		}

		/** @inheritdoc */
		async _onRender(context, options) {
			await super._onRender(context, options);
			for (const field of DISPLAY_MODE_FIELDS) this._injectDisplayModes(field);
		}
	};
}
