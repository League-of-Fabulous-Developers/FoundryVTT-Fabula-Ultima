import { FUItem } from '../documents/items/item.mjs';
import { PseudoItem } from '../documents/items/pseudo-item.mjs';

/**
 * @typedef {StringFieldOptions} LocallyEmbeddedDocumentFieldOptions
 * @property {boolean} [fallback=false]  Display the string value if no matching item is found.
 */

/**
 * A subclass of {@link foundry.data.fields.StringField} that references an {@link FUItem} or {@link PseudoItem}
 * within the owning actor by UUID.
 *
 * Conceptually extremely similar to {@link foundry.data.fields.DocumentUUIDField} but only able to reference items
 * embedded within the parent actor.
 *
 * **Important caveat:**
 *
 * Custom validation (`options.validate`) does work slightly differently with this field.
 *
 * Because the field only stores a `string` ID until it is initialized the provided validation function is run the first time
 * the field is accessed instead. If the validation function returns false or throws an error the field value will be `null`.
 */
export class EmbeddedItemUuidField extends foundry.data.fields.StringField {
	/**
	 * @param {LocallyEmbeddedDocumentFieldOptions} options  Options which configure the behavior of the field.
	 */
	constructor({ validate, ...options } = {}) {
		super(options);
		this.userValidate = validate;
	}

	/* -------------------------------------------- */

	/**
	 *
	 * @type {(Document) => boolean}
	 */
	userValidate;

	/* -------------------------------------------- */

	/** @inheritdoc */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			blank: false,
			required: true,
			nullable: true,
			readonly: false,
			idOnly: false,
			fallback: false,
		});
	}

	/* -------------------------------------------- */

	/** @override */
	_cast(value) {
		if (typeof value === 'string') {
			return value;
		}
		if (value instanceof FUItem || value instanceof PseudoItem) {
			return value.uuid;
		}
		throw new Error(`The value provided to a EmbeddedItemUuidField must be an Item or a string UUID..`);
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	_validateType(value) {
		// handled during initialization
	}

	/* -------------------------------------------- */

	/** @override */
	initialize(value, model, options = {}) {
		let actor = null;
		{
			let current = model;
			while (current) {
				if (current instanceof foundry.documents.Actor) {
					actor = current;
					break;
				} else {
					current = current.parent;
				}
			}
		}

		if (!actor) {
			return null;
		}

		const resolvedUuid = foundry.utils.parseUuid(value, { relative: actor });
		if (this.idOnly) {
			if (this.options.fallback || resolvedUuid) {
				return value;
			} else {
				return null;
			}
		}

		if (resolvedUuid && resolvedUuid.primaryType === 'Actor' && resolvedUuid.primaryId === actor.id) {
			let valid = null;
			return () => {
				const document = foundry.utils.fromUuidSync(resolvedUuid.uuid, { relative: actor });
				if (!document) {
					return this.options.fallback ? value : null;
				} else {
					if (this.userValidate) {
						if (valid) {
							return document;
						} else if (valid === null) {
							try {
								valid = this.userValidate(document) ?? true;
								return valid ? document : null;
							} catch (e) {
								valid = false;
								return null;
							}
						} else {
							return null;
						}
					} else {
						return document;
					}
				}
			};
		} else {
			return null;
		}
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	toObject(value) {
		return value?._id ?? value;
	}

	_toInput(config) {
		Object.assign(config, { type: 'Item', single: true });
		return foundry.applications.elements.HTMLDocumentTagsElement.create(config);
	}
}
