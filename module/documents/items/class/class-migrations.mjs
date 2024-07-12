function migrateLegacyResources(source) {
	const benefits = (source.benefits ??= {});
	const resources = (benefits.resources ??= {});

	for (const resource of ['hp', 'mp', 'ip']) {
		if (resource in benefits) {
			const value = (resources[resource] ??= {});
			value.value = benefits[resource].value ?? false;
			delete benefits[resource];
		}
	}
}

function migrateLegacyProficiencies(source) {
	const benefits = (source.benefits ??= {});
	const martials = (benefits.martials ??= {});

	for (const proficiency of ['melee', 'ranged', 'armor', 'shields']) {
		if (proficiency in benefits) {
			const value = (martials[proficiency] ??= {});
			value.value = benefits[proficiency].value ?? false;
			delete benefits[proficiency];
		}
	}
}

export class ClassMigrations {
	static run(source) {
		migrateLegacyResources(source);
		migrateLegacyProficiencies(source);
	}
}
