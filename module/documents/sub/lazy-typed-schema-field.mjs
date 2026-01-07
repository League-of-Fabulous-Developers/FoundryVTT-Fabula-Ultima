const { TypedSchemaField } = foundry.data.fields;

/**
 * A subclass of TypedSchemaField that does not throw an error if the `type` of the
 * embedded model is invalid, e.g., due to disabled modules.
 */
export class LazyTypedSchemaField extends TypedSchemaField {
	/** @inheritdoc */
	_validateSpecial(value) {
		if (!value || value.type in this.types) {
			return super._validateSpecial(value);
		}
		return true;
	}
}
