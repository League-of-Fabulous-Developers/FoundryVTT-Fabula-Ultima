import { SYSTEM } from '../helpers/config.mjs';
import { FUTokenConfigMixin } from './token-config-mixin.mjs';

export class FUTokenConfig extends FUTokenConfigMixin(foundry.applications.sheets.TokenConfig) {
	/** @inheritdoc */
	_setDisplayModeFlag(field, value, data) {
		foundry.utils.setProperty(data, `flags.${SYSTEM}.${field}`, value);
	}

	/** @inheritdoc */
	_getDisplayModeFlag(field) {
		return this.document.flags?.[SYSTEM]?.[field] ?? this._getOriginalDisplayMode(field);
	}

	/** @inheritdoc */
	_getOriginalDisplayMode(field) {
		return this.document[field];
	}
}
