// //================================================== OVERWRITING PLUGIN ==================================================
// //sample overwriting of the stringTypePlugin
// class customStringTypePlugin extends TypePlugin {
//     constructor() {
//         super();
//         this.name = 'stringTypePlugin'; //this should be the same as the plugin you are overwriting ([type]TypePlugin)
//     }
//
//     validate(value) {
//
//     }
//
//     getJSQLFormat(value) {
//
//     }
//
//     evaluate(query, data) {
//
//     }
// }
//
// //ideas for plugins
// // constructor(shouldDoA, shouldDoB, shouldDoC) {
// //     super();
// //     this.shouldDoA = shouldDoA;
// //     this.shouldDoB = shouldDoB;
// //     this.shouldDoC = shouldDoC;
// // }
// //DynamicGrid.engine.addPlugin(new customStringTypePlugin(true, false, true)); //this will overwrite the stringTypePlugin with custom settings that you can use, for example, to disable certain features
//
// //================================================== ADDING PLUGIN ==================================================
// class moneyTypePlugin extends TypePlugin {
//     constructor(props) {
//         super(props);
//         //this.name is already set in the parent class, you can override it if you want
//     }
//
//     validate(value) {
//
//     }
//
//     getJSQLFormat(value) {
//
//     }
//
//     evaluate(query, data) {
//
//     }
// }