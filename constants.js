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
        return this.operators.find(op => op.name === operatorOrName || op.operator === operatorOrName);
    }
}