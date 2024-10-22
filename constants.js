class DynamicGridConstants {

    constructor(props) {
        this.operators =
        [
            {name: 'eq', operator: '='},
            {name: 'neq', operator: '!='},
            {name: 'gt', operator: '>'},
            {name: 'lt', operator: '<'},
            {name: 'gte', operator: '>='},
            {name: 'lte', operator: '<='},
            {name: 'contains', operator: 'contains'},
            {name: 'in', operator: 'in'}
        ];
    }

    getOperator(operatorOrName) {
        try {
            return this.operators.find(op => op.name === operatorOrName || op.operator === operatorOrName);
        }
        catch (e) {
            console.error(e);
            return undefined;
        }
    }

    getOperatorNames() {
        return this.operators.map(op => op.name);
    }

    getOperatorSymbols() {
        return this.operators.map(op => op.operator);
    }
}