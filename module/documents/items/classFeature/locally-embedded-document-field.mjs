/**
 * @typedef {StringFieldOptions} LocallyEmbeddedDocumentFieldOptions
 * @property {boolean} [fallback=false]  Display the string value if no matching item is found.
 */

/**
 * A subclass of {@link foundry.data.fields.DocumentIdField} that references an embedded {@link foundry.abstract.Document}
 * within some parent {@link foundry.abstract.Document} of this field.
 *
 * Conceptually extremely similar to {@link foundry.data.fields.ForeignDocumentField} but only able to reference {@link foundry.abstract.Document Documents}
 * embedded within a parent of the {@link foundry.abstract.DataModel} this field is defined in.
 *
 * **Important caveat:**
 *
 * Custom validation (`options.validate`) does work slightly differently with this field.
 *
 * Because the field only stores a `string` ID until it is initialized the provided validation function is run each time
 * the field is accessed instead. If the validation function returns false or throws an error the field value will be `null`.
 */
export class LocallyEmbeddedDocumentField extends foundry.data.fields.DocumentIdField {
	/**
	 * @param {typeof Document} embeddedType The embedded Document class this field should reference
	 * @param {typeof Document} parentType The Document class this field should to locate its reference in
	 * @param {LocallyEmbeddedDocumentFieldOptions} options  Options which configure the behavior of the field.
	 */
	constructor(embeddedType, parentType, { validate, ...options } = {}) {
		if (!foundry.utils.isSubclass(embeddedType, foundry.abstract.Document)) {
			throw new Error('A LocallyEmbeddedDocumentField must specify a Document subclass as its embedded type');
		}
		if (!foundry.utils.isSubclass(parentType, foundry.abstract.Document)) {
			throw new Error('A LocallyEmbeddedDocumentField must specify a Document subclass as its parent type');
		}

		super(options);
		this.embeddedType = embeddedType;
		this.parentType = parentType;
		this.userValidate = validate;
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

	/**
	 *
	 * @type {(Document) => boolean}
	 */
	userValidate;

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
			const document = collection?.get(value);
			if (!document) {
				return this.options.fallback ? value : null;
			} else {
				try {
					return this.userValidate(document) ? document : null;
				} catch (e) {
					return null;
				}
			}
		};
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	toObject(value) {
		return value?._id ?? value;
	}
}
