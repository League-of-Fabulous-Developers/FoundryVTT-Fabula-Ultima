export class EquipDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { StringField } = foundry.data.fields;
		return {
			armor: new StringField({ nullable: true }),
			mainHand: new StringField({ nullable: true }),
			offHand: new StringField({ nullable: true }),
			accessory: new StringField({ nullable: true }),
			phantom: new StringField({ nullable: true }),
			arcanum: new StringField({ nullable: true }),
		};
	}

	isEquipped(item) {
		return item && Object.values(this).includes(item?.id);
	}
}
