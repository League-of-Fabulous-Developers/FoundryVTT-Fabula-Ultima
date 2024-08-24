import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

// Function to read CSV data from a file using Papa Parser
function readCsvData(csvPath) {
	const csvFile = fs.readFileSync(csvPath, 'utf8');
	return Papa.parse(csvFile, { header: true }).data;
}

// Function to convert Unicode escape sequences to HTML tags
function convertUnicodeToHtml(value) {
	if (!value && value !== '') return ''; // Handle undefined and empty string values
	return value.replace(/\\u(\w{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Function to save JSON data to files for each language
function saveJsonToFile(data, typesData, fuidData, outputFolder) {
	const langData = {};

	// Determine languages from data
	const languages = Object.keys(data[0].data[0]).filter((header) => header !== 'key');

	// Iterate through each language
	languages.forEach((lang) => {
		// Initialize language data object
		langData[lang] = {};

		// Populate language data object with key-value pairs
		data.forEach((sheet) => {
			langData[lang][sheet.name] = {};
			sheet.data.forEach((row) => {
				const key = row.key;
				const translation = convertUnicodeToHtml(row[lang]);
				if (key !== undefined && translation !== undefined) {
					// Check for undefined values
					langData[lang][sheet.name][key] = translation;
				}
			});
		});

		// Populate TYPES section
		const typesSection = { Actor: {}, Item: {} };
		// Process typesData to populate typesSection
		typesData.forEach((row) => {
			const key = row.key;
			if (key === 'Actor' || key === 'Item') {
				return;
			}
			const category = key.split('_')[0]; // Extract 'Actor' or 'Item'
			const subKey = key.substring(category.length + 1); // Extract the actual key after 'Actor_' or 'Item_'
			const translation = convertUnicodeToHtml(row[lang]);
			if (category && subKey && translation) {
				if (!typesSection[category]) {
					typesSection[category] = {}; // Initialize if not already
				}
				typesSection[category][subKey] = translation;
			}
		});

		// Populate FUID section
		const fuidSection = {};
		fuidData.forEach((row) => {
			const key = row.key;
			const translation = convertUnicodeToHtml(row[lang]);
			if (key && translation) {
				fuidSection[key] = translation;
			}
		});

		// Create final JSON structure
		const finalJson = {
			ACTOR: langData[lang]['Project FU Localization - ACTOR'] || {},
			ITEM: langData[lang]['Project FU Localization - ITEM'] || {},
			TYPES: typesSection,
			FU: {
				...(langData[lang]['Project FU Localization - FU'] || {}),
				FUID: fuidSection,
			},
		};

		// Write language data to JSON file
		const outputFile = path.join(outputFolder, `${lang}.json`);
		fs.writeFileSync(outputFile, JSON.stringify(finalJson, null, 4));
	});
}

// Define input and output paths
const inputFolder = 'tools/csvtojson/import';
// const outputFolder = 'tools/csvtojson/export';
const outputFolder = 'lang/';

// CSV files to read
const csvFiles = ['Project FU Localization - ACTOR.csv', 'Project FU Localization - ITEM.csv', 'Project FU Localization - FU.csv', 'Project FU Localization - FUID.csv'];
const csvData = csvFiles.map((file) => ({
	name: path.basename(file, '.csv'),
	data: readCsvData(path.join(inputFolder, file)),
}));

// Separate TYPES and FUID data processing
const typesData = readCsvData(path.join(inputFolder, 'Project FU Localization - TYPES.csv'));
const fuidData = readCsvData(path.join(inputFolder, 'Project FU Localization - FUID.csv'));

// Save JSON to files for each language
saveJsonToFile(csvData, typesData, fuidData, outputFolder);

console.log('CSV to JSON conversion completed.');
