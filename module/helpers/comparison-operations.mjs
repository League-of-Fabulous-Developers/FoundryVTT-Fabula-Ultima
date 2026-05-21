/**
 * @callback ComparisonOperation
 * @param {number} lhs left-hand side operand
 * @param {number} rhs right-hand side operand
 * @return boolean
 */

/**
 * @type ComparisonOperation
 */
const greaterThan = (lhs, rhs) => {
	return lhs > rhs;
};

/**
 * @type ComparisonOperation
 */
const greaterThanOrEqual = (lhs, rhs) => {
	return lhs >= rhs;
};

/**
 * @type ComparisonOperation
 */
const equals = (lhs, rhs) => {
	return lhs === rhs;
};

/**
 * @type ComparisonOperation
 */
const lessThanOrEqual = (lhs, rhs) => {
	return lhs <= rhs;
};

/**
 * @type ComparisonOperation
 */
const lessThan = (lhs, rhs) => {
	return lhs < rhs;
};

/**
 * @type {Record<FUComparisonOperator, ComparisonOperation>}
 */
export const ComparisonOperations = {
	greaterThan,
	greaterThanOrEqual,
	equals,
	lessThanOrEqual,
	lessThan,
};
