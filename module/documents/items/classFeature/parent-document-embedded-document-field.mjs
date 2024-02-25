/**
 * @typedef LocallyEmbeddedDocumentFieldOptions
 * @extends StringFieldOptions
 * @property {boolean} [fallback=false]  Display the string value if no matching item is found.
 */

/**
 * A mirror of ForeignDocumentField that references a Document embedded within this Document or .
 *
 * @param {typeof Document} model              The local DataModel class definition which this field should link to.
 * @param {LocallyEmbeddedDocumentFieldOptions} options  Options which configure the behavior of the field.
 */
export class ParentDocumentEmbeddedDocumentField extends foundry.data.fields.DocumentIdField {
	constructor(embeddedType, parentType, options = {}) {
		if (!foundry.utils.isSubclass(embeddedType, foundry.abstract.Document)) {
			throw new Error('A ParentDocumentEmbeddedDocumentField must specify a Document subclass as its embedded type');
		}
		if (!foundry.utils.isSubclass(parentType, foundry.abstract.Document)) {
			throw new Error('A ParentDocumentEmbeddedDocumentField must specify a Document subclass as its parent type');
		}

		super(options);
		this.embeddedType = embeddedType;
		this.parentType = parentType;
	}

	/* -------------------------------------------- */

	/**
	 * A reference to the model class which is stored in this field.
	 * @type {typeof Document}
	 */
	embeddedType;

	/**
	 * A reference to the model class which is looked for as the parent.
	 * @type {typeof Document}
	 */
	parentType;

	/* -------------------------------------------- */

	/** @inheritdoc */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
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
		if (value instanceof this.embeddedType) {
			return value._id;
		}
		throw new Error(`The value provided to a LocalDocumentField must be a ${this.embeddedType.name} instance.`);
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	_validateType(value) {
		if (!this.options.fallback) {
			super._validateType(value);
		}
	}

	/* -------------------------------------------- */

	/** @override */
	initialize(value, model, options = {}) {
		if (this.idOnly) {
			return this.options.fallback || foundry.data.validators.isValidId(value) ? value : null;
		}
		let collection = null;
		{
			let current = model;
			while (!!current) {
				if (current instanceof this.parentType) {
					collection = current[this.embeddedType.metadata.collection];
					break;
				} else {
					current = current.parent;
				}
			}
		}
		return () => {
			console.log(collection);
			const document = collection?.get(value);
			if (!document) {
				return this.options.fallback ? value : null;
			}
			if (this.options.fallback) {
				Object.defineProperty(document, 'toString', {
					value: () => document.name,
					configurable: true,
					enumerable: false,
				});
			}
			return document;
		};
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	toObject(value) {
		return value?._id ?? value;
	}
}
