import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

// Function to read JSON data from a file
function readJsonData(jsonPath) {
	const jsonFile = fs.readFileSync(jsonPath, 'utf8');
	return JSON.parse(jsonFile);
}

// Function to save CSV data to files
function saveCsvToFile(jsonData, outputFolder) {
	// Initialize CSV data structures for each CSV
	const csvData = {
		'Project FU Localization - ACTOR.csv': {},
		'Project FU Localization - ITEM.csv': {},
		'Project FU Localization - FU.csv': {},
		'Project FU Localization - TYPES.csv': {},
		'Project FU Localization - FUID.csv': {},
	};

	// Process each language JSON data
	Object.keys(jsonData).forEach((lang) => {
		const data = jsonData[lang];

		// Process ACTOR section
		Object.entries(data.ACTOR || {}).forEach(([key, value]) => {
			if (!csvData['Project FU Localization - ACTOR.csv'][key]) {
				csvData['Project FU Localization - ACTOR.csv'][key] = { key };
			}
			csvData['Project FU Localization - ACTOR.csv'][key][lang] = value;
		});

		// Process ITEM section
		Object.entries(data.ITEM || {}).forEach(([key, value]) => {
			if (!csvData['Project FU Localization - ITEM.csv'][key]) {
				csvData['Project FU Localization - ITEM.csv'][key] = { key };
			}
			csvData['Project FU Localization - ITEM.csv'][key][lang] = value;
		});

		// Process FU section
		Object.entries(data.FU || {}).forEach(([key, value]) => {
			if (key === 'FUID') {
				// Skip FUID data here, we'll handle it separately
				return;
			}
			if (!csvData['Project FU Localization - FU.csv'][key]) {
				csvData['Project FU Localization - FU.csv'][key] = { key };
			}
			csvData['Project FU Localization - FU.csv'][key][lang] = value;
		});

		// Process TYPES section
		Object.entries(data.TYPES.Actor || {}).forEach(([key, value]) => {
			if (!csvData['Project FU Localization - TYPES.csv'][`Actor_${key}`]) {
				csvData['Project FU Localization - TYPES.csv'][`Actor_${key}`] = { key: `Actor_${key}` };
			}
			csvData['Project FU Localization - TYPES.csv'][`Actor_${key}`][lang] = value;
		});

		Object.entries(data.TYPES.Item || {}).forEach(([key, value]) => {
			if (!csvData['Project FU Localization - TYPES.csv'][`Item_${key}`]) {
				csvData['Project FU Localization - TYPES.csv'][`Item_${key}`] = { key: `Item_${key}` };
			}
			csvData['Project FU Localization - TYPES.csv'][`Item_${key}`][lang] = value;
		});

		Object.entries(data.FU?.FUID || {}).forEach(([key, value]) => {
			if (!csvData['Project FU Localization - FUID.csv'][key]) {
				csvData['Project FU Localization - FUID.csv'][key] = { key };
			}
			csvData['Project FU Localization - FUID.csv'][key][lang] = value;
		});
	});

	// Write CSV data to files
	Object.keys(csvData).forEach((fileName) => {
		const filePath = path.join(outputFolder, fileName);
		const csv = Papa.unparse(Object.values(csvData[fileName]), { quotes: true });
		fs.writeFileSync(filePath, csv);
	});
}

// Define input and output paths
const inputFolder = 'lang/';
const outputFolder = 'tools/jsontocsv/export';

// JSON files to read
const jsonFiles = fs.readdirSync(inputFolder).filter((file) => file.endsWith('.json'));
const jsonData = {};

jsonFiles.forEach((file) => {
	const lang = path.basename(file, '.json');
	jsonData[lang] = readJsonData(path.join(inputFolder, file));
});

// Save CSV to files
saveCsvToFile(jsonData, outputFolder);

console.log('JSON to CSV conversion completed.');
