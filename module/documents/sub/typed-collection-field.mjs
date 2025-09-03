import { LazyTypedSchemaField } from './lazy-typed-schema-field.mjs';
import { ModelCollection } from './model-collection.mjs';
import { SubDocumentDataModel } from './sub-document-data-model.mjs';

const { TypedObjectField, EmbeddedDataField } = foundry.data.fields;

/**
 * @desc A collection that houses sub-documents, which can have different types.
 * @inheritDoc ModelCollection
 */
export class TypedCollectionField extends TypedObjectField {
	/**
	 * The pseudo-document class.
	 * @type {typeof SubDocumentDataModel}
	 */
	#documentClass;
	get documentClass() {
		return this.#documentClass;
	}

	/**
	 * @param {typeof SubDocumentDataModel} model   The value type of each entry in this object.
	 * @param {DataFieldOptions} [options]    Options which configure the behavior of the field.
	 * @param {DataFieldContext} [context]    Additional context which describes the field.
	 */
	constructor(model, options = {}, context = {}) {
		let field = foundry.utils.isSubclass(model, SubDocumentDataModel) ? new LazyTypedSchemaField(model.TYPES) : new EmbeddedDataField(model);
		options.validateKey ||= (key) => foundry.data.validators.isValidId(key);
		super(field, options, context);
		this.#documentClass = model;
	}

	/* -------------------------------------------------- */

	/** @inheritdoc */
	initialize(value, model, options = {}) {
		const collection = new ModelCollection();
		options.collection = collection;
		const init = super.initialize(value, model, options);
		for (const [id, model] of Object.entries(init)) {
			if (model instanceof SubDocumentDataModel) {
				collection.set(id, model);
			} else {
				collection.setInvalid(model);
			}
		}
		collection.documentClass = this.documentClass;
		return collection;
	}

	/**
	 * @param {TypedCollectionField} field
	 * @param {String} type
	 * @param document
	 */
	static async addModel(field, type, document) {
		return field.documentClass.create({ type }, { parent: document });
	}
}
