import { FU } from './config.mjs';

export function promptItemCustomizer(actor, item) {
	const dialogTitle = game.i18n.localize('FU.ItemCustomizer');

	function generateSelectOptions(options, nested = false) {
		return Object.entries(options)
			.map(([value, label]) => {
				if (nested) {
					return `<option value="${value}">${game.i18n.localize(label.name)}</option>`;
				} else {
					return `<option value="${value}">${game.i18n.localize(label)}</option>`;
				}
			})
			.join('');
	}

	function generateWeaponOptions(actor, initialWeaponId) {
		return actor.items
			.filter((item) => item.type === 'weapon' || item.type === 'basic')
			.map((item) => `<option value="${item.id}" ${item.id === initialWeaponId ? 'selected' : ''}>${item.name}</option>`)
			.join('');
	}

	function capFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	function getItemDetails(item, damageType, weaponType, accuracyMod = 0, damageMod = 0, hrZeroBool) {
		const die1 = item.system.attributes.primary.value;
		const die2 = item.system.attributes.secondary.value;
		const accMod = item.system.accuracy.value + accuracyMod;
		const dmgMod = item.system.damage.value + damageMod;
		const dmgType = capFirstLetter(damageType || item.system.damageType.value);
		const weapType = capFirstLetter(weaponType || item.system.type.value);
		const hrZeroLabel = hrZeroBool ? `HR0` : `HR`;

		return `
        <div class="flexcol dialog-name">
            <div class="flexrow">
                <div class="dialog-image">
                    <img src="${item.img}" data-tooltip="${item.name}" />
                </div>
                <label class="resource-content resource-label">
                    ${item.name}
                    <strong>【${(die1 + ' + ' + die2).toUpperCase()}】 +${accMod}</strong>
                    <strong> ⬥ </strong>
                    <strong>【${hrZeroLabel} + ${dmgMod}】</strong> ${dmgType}
                </label>
            </div>
            <div>
                <strong>${weapType}</strong>
            </div>
        </div>`;
	}

	const damageTypeOptions = generateSelectOptions(FU.damageTypes);
	const weaponTypeOptions = generateSelectOptions(FU.weaponTypes);
	const defenseTypeOptions = generateSelectOptions(FU.defenses, true);

	if (item.type === 'weapon' || item.type === 'basic') {
		const weaponOptions = generateWeaponOptions(actor, item._id);

		if (weaponOptions.length === 0) {
			ui.notifications.warn(`No weapons found for ${actor.name}`);
			return;
		}

		const initialWeaponId = item._id;
		const initialWeapon = actor.items.get(initialWeaponId);
		let baseWeaponDetails = getItemDetails(initialWeapon);
		let currentWeaponDetails = baseWeaponDetails;

		function extractFormValues(html, actor) {
			const selectedWeaponId = html.find('#weapon-item').val();
			const damageType = html.find('#damage-type').val();
			const weaponType = html.find('#weapon-type').val();
			const defenseType = html.find('#defense-type').val();
			const accuracyMod = parseInt(html.find('#accuracy-mod').val(), 10);
			const damageMod = parseInt(html.find('#damage-mod').val(), 10);
			const selectedWeapon = actor.items.get(selectedWeaponId);
			const hrZeroChecked = html.find('#hrzero').prop('checked');
			const hrZeroBool = hrZeroChecked;

			return {
				selectedWeaponId,
				damageType,
				weaponType,
				defenseType,
				accuracyMod,
				damageMod,
				selectedWeapon,
				hrZeroBool,
			};
		}

		const dialogContentTemplate = (weaponOptions, baseWeaponDetails, currentWeaponDetails) => `
        <form>
            <div>
                <div class="desc mb-3">
                    <div id="base-item" class="inline-desc">${baseWeaponDetails}</div>
                    <div style="text-align: center;margin:5px 0;"><i class="fa-solid fa-arrow-down"></i></div>
                    <div id="current-item" class="inline-desc">${currentWeaponDetails}</div>
                </div>
            </div>

            <div class="desc grid grid-2col gap-5">
                <div class="gap-2">
                    <div class="form-group"><label for="weapon-item"><b>${game.i18n.localize('FU.Weapon')}</b></label><select id="weapon-item">${weaponOptions}</select></div>
                    <div class="form-group"><label for="damage-type"><b>${game.i18n.localize('FU.DamageType')}</b></label><select id="damage-type">${damageTypeOptions}</select></div>
                    <div class="form-group"><label for="weapon-type"><b>${game.i18n.localize('FU.WeaponType')}</b></label><select id="weapon-type">${weaponTypeOptions}</select></div>
                    <div class="form-group"><label for="defense-type"><b>${game.i18n.localize('FU.DefenseType')}</b></label><select id="defense-type">${defenseTypeOptions}</select></div>            
                </div>
                <div class="gap-2">
                    <div class="form-group"><label for="accuracy-mod"><b>${game.i18n.localize('FU.AccuracyBonus')}</b></label><input id="accuracy-mod" type="number" step="1" value="0"></div>
                    <div class="form-group"><label for="damage-mod"><b>${game.i18n.localize('FU.DamageBonus')}</b></label><input id="damage-mod" type="number" step="1" value="0"></div>
                    <div class="grid grid-2col">
                        <div class="form-group"><label for="hrzero"><b>${game.i18n.localize('FU.HRZeroStatus')}</b></label><input id="hrzero" type="checkbox"></div>
                    </div>
                </div>
            </div>
        </form>`;

		const dialogContent = dialogContentTemplate(weaponOptions, baseWeaponDetails, currentWeaponDetails);

		const dialog = new Dialog(
			{
				title: dialogTitle,
				content: dialogContent,
				buttons: {
					modify: {
						label: 'Modify',
						callback: async (html) => {
							const { damageType, weaponType, defenseType, accuracyMod, damageMod, selectedWeapon, hrZeroBool } = extractFormValues(html, actor);

							await selectedWeapon.update({
								'system.accuracy.value': selectedWeapon.system.accuracy.value + accuracyMod,
								'system.damage.value': selectedWeapon.system.damage.value + damageMod,
								'system.damageType.value': damageType,
								'system.type.value': weaponType,
								'system.defense': defenseType,
								'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
							});

							ui.notifications.info(`${selectedWeapon.name} modified for ${actor.name}`);
						},
					},
					clone: {
						label: 'Clone',
						callback: async (html) => {
							const { damageType, weaponType, defenseType, accuracyMod, damageMod, selectedWeapon, hrZeroBool } = extractFormValues(html, actor);

							const { value, slot } = selectedWeapon.system.isEquipped;

							await selectedWeapon.update({
								'system.isEquipped.value': false,
								'system.isEquipped.slot': 'default',
							});

							const newItemData = foundry.utils.deepClone(selectedWeapon);
							const newItemName = `${newItemData.name} (Modified)`;

							const newItem = await Item.create(newItemData, { parent: actor });

							await newItem.update({
								'system.accuracy.value': newItemData.system.accuracy.value + accuracyMod,
								'system.damage.value': newItemData.system.damage.value + damageMod,
								'system.damageType.value': damageType,
								'system.defense': defenseType,
								'system.type.value': weaponType,
								'system.isEquipped.value': value,
								'system.isEquipped.slot': slot,
								'system.rollInfo.useWeapon.hrZero.value': hrZeroBool,
							});

							await newItem.update({ name: newItemName });

							ui.notifications.info(`${newItem.name} cloned and added to ${actor.name}`);
						},
					},

					tempRoll: {
						label: 'Temp Roll',
						callback: async (html) => {
							const { damageType, weaponType, defenseType, accuracyMod, damageMod, selectedWeapon, hrZeroBool } = extractFormValues(html, actor);

							const originalValues = {
								accuracy: selectedWeapon.system.accuracy.value,
								damage: selectedWeapon.system.damage.value,
								damageType: selectedWeapon.system.damageType.value,
								weaponType: selectedWeapon.system.type.value,
								defenseType: selectedWeapon.system.defense,
							};

							await selectedWeapon.update({
								'system.accuracy.value': originalValues.accuracy + accuracyMod,
								'system.damage.value': originalValues.damage + damageMod,
								'system.damageType.value': damageType || originalValues.damageType,
								'system.type.value': weaponType || originalValues.weaponType,
								'system.defense': defenseType || originalValues.defenseType,
							});

							await selectedWeapon.roll({
								shift: hrZeroBool,
							});

							await new Promise((resolve) => setTimeout(resolve, 1000));

							await selectedWeapon.update({
								'system.accuracy.value': originalValues.accuracy,
								'system.damage.value': originalValues.damage,
								'system.damageType.value': originalValues.damageType,
								'system.type.value': originalValues.weaponType,
								'system.defense': originalValues.defenseType,
							});

							// Re-render the dialog to keep it open
							dialog.render(true);
						},
						close: false,
					},
					cancel: {
						label: 'Cancel',
						callback: () => {},
					},
				},
				default: 'modify',
				render: (html) => {
					html.find('#weapon-item').change((ev) => {
						const selectedWeaponId = html.find('#weapon-item').val();
						const selectedWeapon = actor.items.get(selectedWeaponId);
						baseWeaponDetails = getItemDetails(initialWeapon);
						currentWeaponDetails = getItemDetails(
							selectedWeapon,
							html.find('#damage-type').val(),
							html.find('#weapon-type').val(),
							parseInt(html.find('#accuracy-mod').val(), 10),
							parseInt(html.find('#damage-mod').val(), 10),
							html.find('#hrzero').prop('checked'),
						);

						html.find('#base-item').html(baseWeaponDetails);
						html.find('#current-item').html(currentWeaponDetails);
					});

					html.find('input,select').change((ev) => {
						currentWeaponDetails = getItemDetails(
							actor.items.get(html.find('#weapon-item').val()),
							html.find('#damage-type').val(),
							html.find('#weapon-type').val(),
							parseInt(html.find('#accuracy-mod').val(), 10),
							parseInt(html.find('#damage-mod').val(), 10),
							html.find('#hrzero').prop('checked'),
						);

						html.find('#current-item').html(currentWeaponDetails);
					});
				},
			},
			{
				width: 440,
				classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			},
		);

		dialog.render(true);
	}
}
