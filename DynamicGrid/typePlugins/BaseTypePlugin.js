/**
 * BaseTypePlugin is an abstract class that defines the structure for type plugins.
 * It provides methods for validation, parsing values, evaluating conditions, and generating input components.
 * Subclasses must implement the `validate`, `parseValue`, and `evaluate` methods.
 *
 * @abstract
 * @class BaseTypePlugin
 * @param {Object} [config={}] - Configuration options for the plugin.
 */
class BaseTypePlugin {

    constructor(config = {}) {
        if (this.constructor === BaseTypePlugin) {
            throw new Error("BaseTypePlugin is abstract");
        }

        //List of all available operators for this type plugin.
        this.operators = ['==', '!='];

        //table of all available operators and their labels
        this.operatorsLabels = {
            '==': 'equals',
            '!=': 'not equals',
            '<': 'less than',
            '<=': 'less than or equal to',
            '>': 'greater than',
            '>=': 'greater than or equal to',
            '%=': 'starts with',
            '=%': 'ends with',
            '*=': 'contains',
            '!*=': 'does not contain',
            '!!': 'is empty',
            '??': 'is not empty',
        };

        //options are: 'boolean', 'date', 'number', 'string'
        this.sortingHint = 'string';
    }

    /**
     * Validates a given value.
     * Must be implemented by subclasses.
     *
     * @abstract
     * @param {*} value - The value to validate.
     * @throws {Error} If not implemented in a subclass.
     * @returns {boolean} True if the value is valid, false otherwise.
     */
    validate(value) {
        throw new Error("validate must be implemented");
    }

    /**
     * Parses a given value.
     * Must be implemented by subclasses.
     *
     * @abstract
     * @param {*} value - The value to parse.
     * @returns {*} The parsed value.
     * @throws {Error} If not implemented in a subclass.
     */
    parseValue(value) {
        throw new Error("parseValue must be implemented");
    }

    /**
     * Evaluates a condition based on the provided operator and values. (must only be used when operator is not '==' or '!=').
     *
     * @param {*} dataValue - The value from the data to compare.
     * @param {string} operator - The operator to use for evaluation (e.g., '==', '!=').
     * @param {*} compareValue - The value to compare against.
     * @abstract
     */
    evaluateCondition(dataValue, operator, compareValue) {
        throw new Error("evaluateCondition must be implemented (when operator is not '==' or '!=')");
    }

    /**
     * Evaluates a condition based on the provided operator and values.
     *
     * @param {string} operator - The operator to use for evaluation (e.g., '==', '!=').
     * @param {*} parsedValue - The value to compare against.
     * @returns {Function} The result of the evaluation.
     */
    getConditionChecker(operator, parsedValue) {
        switch (operator) {
            case '==':
                return (parsed) => parsed === parsedValue;
            case '!=':
                return (parsed) => parsed !== parsedValue;
            default:
                return (parsed) => this.evaluateCondition(parsed, operator, parsedValue);
        }
    }

    /**
     * Evaluates a query against the provided data and indices.
     * Filters the indices based on the query conditions.
     *
     * @param {Object} query - The query object containing `field`, `operator`, and `value`.
     * @param {Map} [dataIndexes] - A map of data indexes to evaluate.
     * @param {Object[]} data - The dataset to evaluate against.
     * @param {Set} indices - The set of indices to filter.
     * @returns {Set} The filtered set of indices.
     */
    evaluate(query, dataIndexes, data, indices) {
        const { field, operator, value } = query;
        const parsedValue = this.parseValue(value);

        // Pre-compile the condition check for maximum speed
        const conditionCheck = this.getConditionChecker(operator, parsedValue);

        // Get the field-specific index map
        const fieldIndexes = dataIndexes?.[field];

        if (fieldIndexes && indices && fieldIndexes.size <= indices.size) {
            const fieldIterator = fieldIndexes.keys();
            let current = fieldIterator.next();

            while (!current.done) {
                const indexKey = current.value;
                const parsed = this.parseValue(indexKey);

                if (!conditionCheck(parsed)) {
                    const indexSet = fieldIndexes.get(indexKey);
                    // Batch delete for better performance
                    for (const idx of indexSet) {
                        indices.delete(idx);
                    }
                }
                current = fieldIterator.next();
            }
        } else {
            // Use iterator to avoid issues with Set modification during iteration
            const iterator = indices.values();
            let current = iterator.next();
            const toDelete = [];

            while (!current.done) {
                const index = current.value;
                const dataVal = data[index][field];
                const parsed = this.parseValue(dataVal);

                if (!conditionCheck(parsed)) {
                    toDelete.push(index);
                }
                current = iterator.next();
            }

            // Batch delete all failed matches
            for (let i = 0; i < toDelete.length; i++) {
                const deleted = indices.delete(toDelete[i]);
                if (!deleted) {
                    console.warn(`Failed to delete index: ${toDelete[i]}`);
                }
            }
        }

        return indices;
    }

    /**
     * Generates an input component for user interaction.
     *
     * @param {*} currentValue - The current value of the input.
     * @param {Function} onChange - Callback function to handle input changes.
     * @returns {HTMLInputElement} The generated input element.
     */
    getInputComponent(currentValue, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = '_';
        input.value = currentValue ?? '';
        input.addEventListener('input', (e) => onChange(e.target.value));
        return input;
    }

    getContextMenuItems(columnName, engine, ui) {
        return [];
    }
}