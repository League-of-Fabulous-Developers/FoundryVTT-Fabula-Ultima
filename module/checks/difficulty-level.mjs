/**
 * @typedef {"easy", "normal", "hard", "veryHard" } DifficultyLevel
 */

const difficultyLevelData = {
	easy: {
		key: 'easy',
		value: 7,
		icon: ``,
	},
	normal: {
		key: 'normal',
		value: 10,
		icon: ``,
	},
	hard: {
		key: 'hard',
		value: 13,
		icon: ``,
	},
	veryHard: {
		key: 'veryHard',
		value: 16,
		icon: ``,
	},
};

function toValue(level) {
	return difficultyLevelData[level].value;
}

/** *
 * @param {Number} value
 * @returns {DifficultyLevel}
 */
function fromValue(value) {
	if (value >= difficultyLevelData.veryHard.value) {
		return difficultyLevelData.veryHard.key;
	} else if (value >= difficultyLevelData.hard.value) {
		return difficultyLevelData.hard.key;
	} else if (value >= difficultyLevelData.normal.value) {
		return difficultyLevelData.normal.key;
	}
	return difficultyLevelData.easy.key;
}

export const DifficultyLevel = Object.freeze({
	fromValue,
	toValue,
});
