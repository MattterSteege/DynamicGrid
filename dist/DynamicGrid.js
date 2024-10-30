class DynamicGrid{constructor(config){this.engine=new SJQLEngine(this),this.ui=new DynamicGridUI(this,config.containerId),config.headers&&Object.entries(config.headers).forEach((([key,value])=>{this.engine.headers[key]=value.toLowerCase()})),this.engine.plugins=config.plugins??[],this.engine.addPlugin(new stringTypePlugin,!0),this.engine.addPlugin(new numberTypePlugin,!0),this.engine.addPlugin(new booleanTypePlugin,!0)}setData(data){this.engine.data=this.engine.parseData(data)}setHeaderTypes(headers){Object.entries(headers).forEach((([key,value])=>{this.engine.headers[key]=value.toLowerCase()}))}render=()=>this.ui.render(this.engine.query());query=query=>this.ui.render(this.engine.query(query))}class DynamicGridUI{constructor(dynamicGrid,containerId){this.dynamicGrid=dynamicGrid,this.sortState={},this.init(containerId)}init(containerId){if(this.container=document.querySelector(containerId),!this.container)throw new Error(`Container with id "${containerId}" not found`)}render(data){this.container.className="dynamic-grid-container",this.container.innerHTML="";const table=document.createElement("table");table.className="dynamic-grid",table.appendChild(this.renderHeader()),table.appendChild(this.renderBody(data)),this.container.appendChild(table)}renderHeader(){const thead=document.createElement("thead"),headerRow=document.createElement("tr");return Object.entries(this.dynamicGrid.engine.headers).forEach((([key,type])=>{const th=document.createElement("th"),headerContent=document.createElement("div");headerContent.className="header-content";const titleWrapper=document.createElement("div");titleWrapper.className="title-wrapper";const headerText=document.createElement("span");headerText.textContent=key,titleWrapper.appendChild(headerText);const sortButton=document.createElement("button");sortButton.className="sort-button",sortButton.innerHTML='<span class="sort-icon"></span>',sortButton.onclick=()=>this.handleSort(key),titleWrapper.appendChild(sortButton);const moreButton=document.createElement("button");moreButton.className="more-button",moreButton.innerHTML='<span class="more-icon">&#10247;</span>',titleWrapper.appendChild(moreButton),headerContent.appendChild(titleWrapper),th.appendChild(headerContent),headerRow.appendChild(th)})),thead.appendChild(headerRow),thead}renderBody(data){const tbody=document.createElement("tbody");return data.forEach(((row,index)=>{const tr=document.createElement("tr");tr.className=index%2==0?"row-even":"row-odd",Object.keys(this.dynamicGrid.engine.headers).forEach((key=>{tr.append(this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[key]).renderCell(row[key]))})),tbody.appendChild(tr)})),tbody}handleSort(key){this.sortState[key]="asc"===this.sortState[key]?"desc":"asc",Object.keys(this.sortState).forEach((k=>{k!==key&&delete this.sortState[k]}));const query=this.dynamicGrid.engine.currentQueryStr.replace(/sort\([^)]+\)$/,""),sortQuery=`sort ${key} ${this.sortState[key]}`;this.dynamicGrid.query(query+" and "+sortQuery)}}class TypePlugin{constructor(){this.name=this.constructor.name,this.operators=[],this.addOperators()}getJSQLFormat(value){return console.warn("getHeaderFormat not implemented for plugin: ",this.name),value.toString()}validate(value){return console.warn("validate not implemented for plugin: ",this.name),!0}evaluate(query,data){return console.warn("evaluate not implemented for plugin: ",this.name),data}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field].localeCompare(b[field]):"desc"===value?b[field].localeCompare(a[field]):void 0))}addOperators(){this.operators=[{name:"eq",operator:"=="},{name:"neq",operator:"!="},{name:"em",operator:'""'},{name:"nem",operator:'!""'},{name:"in",operator:"in"}]}getOperator(operatorOrName){try{return this.operators.find((op=>op.name===operatorOrName||op.operator===operatorOrName))}catch(e){return void console.error(e)}}getOperatorSymbols=()=>this.operators.map((op=>op.operator));getOperatorNames=()=>this.operators.map((op=>op.name));renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const elem=document.createElement("td");return elem.innerHTML=value,elem}}class stringTypePlugin extends TypePlugin{constructor(){super()}validate(value){return"string"==typeof value}getJSQLFormat(value){return'"'===value[0]&&'"'===value[value.length-1]||"'"===value[0]&&"'"===value[value.length-1]?value.substring(1,value.length-1):value}evaluate(query,data){let{field:field,operator:operator,value:value}=query;return"in"===operator&&(value=JSON.parse(value)),data.filter((item=>this._evaluate(item[field],operator,value)))}_evaluate(dataValue,operator,value){if(Array.isArray(value)&&value.length>0&&"in"===operator)return value.includes(dataValue);if("string"==typeof value)switch(operator){case"eq":return dataValue===value;case"neq":return dataValue!==value;case"em":return!value||0===value.length;case"nem":return value&&value.length>0;case"swi":return dataValue.startsWith(value);case"ewi":return dataValue.endsWith(value);case"co":return dataValue.includes(value);case"nco":return!dataValue.includes(value)}return!1}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const elem=document.createElement("td");return elem.innerHTML=value,elem}addOperators(){super.addOperators(),this.operators.push({name:"swi",operator:"%="},{name:"ewi",operator:"=%"},{name:"co",operator:"*="},{name:"nco",operator:"!*="},{name:"in",operator:"in"})}}class numberTypePlugin extends TypePlugin{constructor(){super()}validate(value){return!isNaN(Number(value))}getJSQLFormat(value){if(isNaN(Number(value)))throw new Error("Value is not a number");return Number(value)}evaluate(query,data){let{field:field,operator:operator,value:value}=query;return"in"===operator&&(value=JSON.parse(value)),data.filter((item=>this._evaluate(item[field],operator,value)))}_evaluate(dataValue,operator,value){if(Array.isArray(value)&&value.length>0&&"in"===operator)return value.includes(dataValue);if("number"==typeof value)switch(operator){case"eq":return dataValue===value;case"neq":return dataValue!==value;case"gt":return dataValue>value;case"lt":return dataValue<value;case"gte":return dataValue>=value;case"lte":return dataValue<=value}return!1}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const elem=document.createElement("td");return elem.innerHTML=value.toString().replace(/\B(?=(\d{3})+(?!\d))/g,"."),elem}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field]-b[field]:"desc"===value?b[field]-a[field]:void 0))}addOperators(){super.addOperators(),this.operators.push({name:"gt",operator:">"},{name:"lt",operator:"<"},{name:"gte",operator:">="},{name:"lte",operator:"<="},{name:"in",operator:"in"})}}class booleanTypePlugin extends TypePlugin{constructor(){super()}validate(value){return"boolean"==typeof value||"string"==typeof value&&("true"===value||"false"===value)}getJSQLFormat(value){return"true"===value.toLowerCase()}evaluate(query,data){const{field:field,operator:operator,value:value}=query;return data.filter((item=>this._evaluate(item[field],operator,value)))}_evaluate(dataValue,operator,value){if(Array.isArray(value)&&value.length>0&&"in"===operator)return value.forEach((val=>{if(this._evaluate(dataValue,operator,val))return!0}));if("boolean"==typeof value)switch(operator){case"eq":return dataValue===value;case"neq":return dataValue!==value}return!1}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field]-b[field]:"desc"===value?b[field]-a[field]:void 0))}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const elem=document.createElement("td"),checkbox=document.createElement("input");return checkbox.type="checkbox",checkbox.checked=value,checkbox.disabled=!0,elem.appendChild(checkbox),elem}}class QueryParser{static QUERIES={RANGE:/range\s+(-?\d+)-?(-?\d+)?/,SORT:/sort\s+([A-Za-z]+)\s+(asc|desc)/,SELECT:/([A-Za-z]+)\s+(\S+)\s+(.+)/};constructor(engine){this.engine=engine}parseQuery(query){const parsedQuery=query.split(/\s+and\s+/i).map((subQuery=>this.parseSubQuery(subQuery.trim()))).filter((query=>query.queryType));let previousQueryType="";for(let i=0;i<parsedQuery.length;i++)("SORT"===parsedQuery[i].queryType&&"SORT"===previousQueryType||"RANGE"===parsedQuery[i].queryType&&"RANGE"===previousQueryType)&&(parsedQuery.splice(i-1,1),i--),previousQueryType=parsedQuery[i].queryType;return parsedQuery}parseSubQuery(subQuery){for(const[type,regex]of Object.entries(QueryParser.QUERIES)){const match=regex.exec(subQuery);if(match)return this.parseMatch(match,type)||{}}return console.warn("Invalid query: "+subQuery+"\nValid queries are: "+Object.keys(QueryParser.QUERIES).join(", ").toLowerCase()),{}}parseMatch(match,type){if("SELECT"===type){let[_,key,operator,value]=match;const pluginType=this.engine.headers[key],plugin=this.engine.getPlugin(pluginType);if(!plugin)throw new Error("No plugin found for header ("+pluginType+") for key ("+key+")");let field=key,operatorObj=plugin.getOperator(operator);if(!operatorObj)throw new Error(this.formatOperatorError(operator,field,plugin));return plugin.validate(value)&&(value=plugin.getJSQLFormat(value)),{type:pluginType,field:field,operator:operatorObj.name,value:value,queryType:"SELECT"}}if("SORT"===type){let[_,key,value]=match;const pluginType=this.engine.headers[key];if(!this.engine.getPlugin(pluginType))throw new Error("No plugin found for header ("+pluginType+") for key ("+key+")");return{type:pluginType,field:key,operator:"sort",value:value,queryType:"SORT"}}if("RANGE"===type){let[_,lower,upper]=match;return void 0===upper&&(upper=lower,lower=0),lower=parseInt(lower),upper=parseInt(upper),{type:"range",field:"range",operator:"range",lower:lower,upper:upper,queryType:"RANGE"}}}formatOperatorError(operator,field,plugin){return["\n\nInvalid operator:    "+operator,"       For query:    "+field,"     options are:    "+plugin.getOperatorSymbols().join(", "),"\n"].join("\n")}}class SJQLEngine{constructor(DynamicGrid){this.data=[],this.headers=[],this.plugins=[],this.currentQuery={},this.currentQueryStr="",this.QueryParser=new QueryParser(this)}parseData(data){if(0===data.length)return console.warn("No data provided"),[];if(!Array.isArray(data))throw new Error("Data must be an array");return 0===Object.keys(this.headers).length&&(console.warn("No headers provided, auto detecting headers, please provide headers for better performance"),this.autoDetectHeaders(data[0])),data.map(((item,index)=>{const newItem={};newItem.internal_id=index;for(const key of Object.keys(item))newItem[key]=item[key];return newItem}))}autoDetectHeaders(data){for(const key of Object.keys(data))!0===data[key]||!1===data[key]?this.headers[key]="boolean":isNaN(data[key])?this.headers[key]="string":this.headers[key]="number"}query(query){if(!this.data||0===this.data.length)return console.warn("No data provided, returning empty array"),[];if(!query)return console.warn("No query provided, returning all data"),this.data;let data=this.data;this.currentQuery=this.QueryParser.parseQuery(query),this.currentQueryStr=query;for(let i=0;i<this.currentQuery.length;i++){if("SORT"===this.currentQuery[i].queryType&&(data=this.getPlugin(this.currentQuery[i].type).sort(this.currentQuery[i],data)),"RANGE"===this.currentQuery[i].queryType){const lower=this.currentQuery[i].lower||0,upper=this.currentQuery[i].upper||data.length;console.log(lower,upper),data=data.slice(lower,upper)}"SELECT"===this.currentQuery[i].queryType&&(data=this.getPlugin(this.currentQuery[i].type).evaluate(this.currentQuery[i],data))}return data}addPlugin(plugin,dontOverride=!1){if(!(plugin instanceof TypePlugin))throw new Error("Plugin must extend TypePlugin");const existingPlugin=this.getPlugin(plugin.name,!0);dontOverride&&existingPlugin||(existingPlugin&&!dontOverride?(console.warn("Plugin already exists, removing the old plugin"),this.plugins[plugin.name.replace("TypePlugin","")]=plugin):this.plugins[plugin.name.replace("TypePlugin","")]=plugin)}getPlugin(name,justChecking=!1){if(!name)throw new Error("Plugin name not provided");const plugin=this.plugins[name.replace("TypePlugin","")];if(!plugin&&!justChecking)throw new Error("Plugin not found: "+name);return!(!plugin&&justChecking)&&plugin}}