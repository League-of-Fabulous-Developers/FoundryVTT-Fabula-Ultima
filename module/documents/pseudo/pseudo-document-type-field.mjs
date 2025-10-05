import { PseudoDocument } from './pseudo-document.mjs';

export class PseudoDocumentTypeField extends foundry.data.fields.StringField {
	/**
	 * @param {typeof PseudoDocument} documentClass  The base document class which belongs in this field
	 * @param {StringFieldOptions} [options]  Options which configure the behavior of the field
	 * @param {DataFieldContext} [context]    Additional context which describes the field
	 */
	constructor(documentClass, options = {}, context = {}) {
		if (!foundry.utils.isSubclass(documentClass, PseudoDocument)) {
			throw new Error('documentClass must be a subclass of PseudoDocument');
		}
		options.choices = () => documentClass.TYPES;
		options.validationError = `is not a valid type for the ${documentClass.name} PseudoDocument class`;
		super(options, context);
	}

	/** @inheritdoc */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			required: true,
			nullable: false,
			blank: false,
		});
	}

	/** @override */
	_validateType(value, options) {
		if (typeof value !== 'string' || !value) throw new Error('must be a non-blank string');
		if (this._isValidChoice(value)) return true;
		// Allow unrecognized types if we are allowed to fallback (non-strict validation)
		if (options.fallback) return true;
		throw new Error(`"${value}" ${this.options.validationError}`);
	}
}
