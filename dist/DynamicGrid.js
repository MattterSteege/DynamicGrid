class DynamicGrid{constructor(config){this.engine=new SJQLEngine(config.engine||{}),this.engine.plugins=config.plugins??[],this.engine.addPlugin(new stringTypePlugin,!0),this.engine.addPlugin(new numberTypePlugin,!0),this.engine.addPlugin(new booleanTypePlugin,!0),config.headers&&Object.entries(config.headers).forEach((([key,value])=>{this.engine.headers[key]=value.toLowerCase()})),this.virtualScrolling=config.ui.virtualScrolling??!0,this.rowHeight=config.ui.rowHeight||40,this.visibleRows=config.ui.visibleRows||20,this.ui=new DynamicGridUI(this,config.ui)}importData(data,config){this.engine.importData(data,config),this.engine.createDataIndex()}render(query){this.ui.render(this.engine.query(query))}}class DynamicGridUI{constructor(dynamicGrid,ui_config){this.dynamicGrid=dynamicGrid,this.containerId=ui_config.containerId,this.table=null,this.header=null,this.body=null,this.scrollContainer=null,this.visibleRowsContainer=null,this.config={minColumnWidth:ui_config.minColumnWidth??5,rowHeight:ui_config.rowHeight??40,bufferedRows:ui_config.bufferedRows??10,autoFitCellWidth:ui_config.autoFitCellWidth??"header"},this.#_init(this.containerId),this.UIChache=0,this.UICacheRefresh=!1}render(data){if(!data||0===data.length)return this.body?.remove(),void this.scrollContainer?.remove();const isGrouped=data=>Array.isArray(firstItem(data)),cacheHash=isGrouped(data)?FastHash(Object.keys(firstItem(data))):FastHash(Object.keys(data[0]));this.UICacheRefresh=this.UIChache!==cacheHash,this.UIChache=cacheHash,this.table=this.#_createResizableTable(Object.keys(data[0]),data[0]),this.#_initResizerDelegation(),this.#_renderTable(data,isGrouped(data))}toggleColumn(index){const columnWidth=this.columnWidths[index];this.columnWidths[index]=0===columnWidth?100:0;const showingColumns=this.columnWidths.filter((width=>width>0)).length;this.columnWidths=this.columnWidths.map((width=>0===width?0:100/showingColumns)),this.#_updateColumnWidths(this.table)}#_init(containerId){if(this.container=document.querySelector(containerId),!this.container)throw new GridError(`Container with id "${containerId}" not found`)}#_initResizerDelegation(){this.table.addEventListener("mousedown",(e=>{e.button;const resizer=e.target.closest(".resizer");if(!resizer)return;const index=parseInt(resizer.getAttribute("data-index"),10);let startX,startWidth,startNextWidth;const table=this.table;startX=e.clientX,startWidth=this.columnWidths[index],startNextWidth=this.columnWidths[index+1];const onMouseMove=e=>{const widthChange=(e.clientX-startX)/table.offsetWidth*100,newWidth=startWidth+widthChange,newNextWidth=startNextWidth-widthChange;newWidth>=this.config.minColumnWidth&&newNextWidth>=this.config.minColumnWidth&&(this.columnWidths[index]=Number(newWidth.toFixed(2)),this.columnWidths[index+1]=Number(newNextWidth.toFixed(2)),this.#_updateColumnWidths(table))},onMouseUp=()=>{document.removeEventListener("mousemove",onMouseMove),document.removeEventListener("mouseup",onMouseUp)};document.addEventListener("mousemove",onMouseMove),document.addEventListener("mouseup",onMouseUp)}))}#_renderTable(data){const headers=Object.keys(data[0]);headers.remove("internal_id"),this.UICacheRefresh&&(console.log("re-rendering header"),this.header=this.#_createTableHeader(headers),this.table.style.display="grid",this.table.style.gridTemplateRows="40px 1fr",this.table.style.width="100%",this.table.style.height="100%",this.#_updateColumnWidths(this.table),this.table.appendChild(this.header)),this.scrollContainer=document.createElement("div"),this.scrollContainer.className="scroll-container",this.scrollContainer.style.overflowY="auto",this.UICacheRefresh&&(this.body=document.createElement("div"),this.body.className="body-container"),this.scrollContainer.appendChild(this.body),this.scrollContainer.addEventListener("scroll",(()=>this.#_updateVisibleRows(data,headers,this.body,this.scrollContainer))),this.table.appendChild(this.scrollContainer),this.container.appendChild(this.table),this.#_updateVisibleRows(data,headers,this.body,this.scrollContainer)}#_updateVisibleRows(data,headers,container,scrollContainer){const totalRows=data.length,totalHeight=totalRows*this.config.rowHeight;container.style.position="relative",container.style.height=`${totalHeight}px`;const scrollTop=scrollContainer.scrollTop,containerHeight=scrollContainer.offsetHeight,startRow=Math.max(0,Math.floor(scrollTop/this.config.rowHeight)-this.config.bufferedRows),endRow=Math.min(totalRows,Math.ceil((scrollTop+containerHeight)/this.config.rowHeight)+this.config.bufferedRows);this.visibleRowsContainer=document.createElement("div"),this.visibleRowsContainer.style.position="absolute",this.visibleRowsContainer.style.top=startRow*this.config.rowHeight+"px",this.visibleRowsContainer.style.left="0",this.visibleRowsContainer.style.right="0",this.visibleRowsContainer.style.display="grid",this.visibleRowsContainer.style.gridTemplateColumns=headers.map(((_,index)=>`var(--column-width-${index+1})`)).join(" ");for(let i=startRow;i<endRow;i++){const tableRow=this.#_createTableRow();headers.forEach((header=>{const plugin=this.dynamicGrid.engine.getPlugin(this.dynamicGrid.engine.headers[header]),cell=this.#_createTableCell(plugin.renderCell(data[i][header]));tableRow.appendChild(cell)})),this.visibleRowsContainer.appendChild(tableRow)}container.lastChild&&container.removeChild(container.lastChild),container.appendChild(this.visibleRowsContainer)}#_createResizableTable(columns,data){if(!this.UICacheRefresh)return this.table;if(this.table?.remove(),columns=columns.filter((column=>"internal_id"!==column)),"header"===this.config.autoFitCellWidth){const charCount=columns.reduce(((acc,header)=>acc+header.length),0);this.columnWidths=columns.map((header=>header.length/charCount*100))}else if("content"===this.config.autoFitCellWidth){const charCount=columns.reduce(((acc,header)=>acc+Math.max(data[header].toString().length,5)),0);this.columnWidths=columns.map((header=>Math.max(data[header].toString().length,5)/charCount*100))}else if("both"===this.config.autoFitCellWidth){const charCount=columns.reduce(((acc,header)=>acc+Math.max(header.length,5)+Math.max(data[header].toString().length,5)),0);this.columnWidths=columns.map((header=>(Math.max(header.length,5)+Math.max(data[header].toString().length,5))/charCount*100))}else"none"!==this.config.autoFitCellWidth&&this.config.autoFitCellWidth||(this.columnWidths=Array(columns.length).fill(100/columns.length));return this.table=document.createElement("div"),this.table.className="table",this.#_updateColumnWidths(this.table),this.table}#_createTableHeader(headers){const header=document.createElement("div");return header.className="row header",header.style.display="grid",header.style.gridTemplateColumns=headers.map(((_,index)=>`var(--column-width-${index+1})`)).join(" "),headers.forEach(((_header,index)=>{const cell=(headers=>{const cell=document.createElement("div");return cell.className="cell",cell.textContent=headers,cell})(_header);cell.title=_header,index<headers.length-1&&cell.appendChild(this.#_createResizer(index)),header.appendChild(cell)})),header}#_createTableRow(){const row=document.createElement("div");return row.className="row",row.style.display="contents",row}#_createTableCell(content=""){const cell=document.createElement("div");return cell.className="cell",cell.innerHTML=content,cell}#_createResizer(index){const resizer=document.createElement("div");let startX,startWidth,startNextWidth;return resizer.className="resizer",resizer.setAttribute("data-index",index),resizer.addEventListener("mousedown",(e=>{e.preventDefault();const table=resizer.closest(".table");startX=e.clientX,startWidth=this.columnWidths[index],startNextWidth=this.columnWidths[index+1];const onMouseMove=e=>{const widthChange=(e.clientX-startX)/table.offsetWidth*100,newWidth=startWidth+widthChange,newNextWidth=startNextWidth-widthChange;newWidth>=this.config.minColumnWidth&&newNextWidth>=this.config.minColumnWidth&&(this.columnWidths[index]=Number(newWidth.toFixed(2)),this.columnWidths[index+1]=Number(newNextWidth.toFixed(2)),this.#_updateColumnWidths(table))},onMouseUp=()=>{document.removeEventListener("mousemove",onMouseMove),document.removeEventListener("mouseup",onMouseUp)};document.addEventListener("mousemove",onMouseMove),document.addEventListener("mouseup",onMouseUp)})),resizer}#_updateColumnWidths(table){this.columnWidths.forEach(((width,index)=>{table.style.setProperty(`--column-width-${index+1}`,`${width}%`)}))}}class TypePlugin{static DEFAULT_OPERATORS=["==","!=","in"];constructor(){if(this.constructor===TypePlugin)throw new Error("TypePlugin is abstract and cannot be instantiated directly");this.name=this.constructor.name,this.operators=["==","!=","in"]}validate(value){throw new Error("validate must be implemented by subclass")}evaluate(query,dataIndexes,data,indices){throw new Error("evaluate must be implemented by subclass")}evaluateCondition(dataValue,operator,compareValue){throw new Error("evaluateCondition must be implemented by subclass")}sort(query,data){const{field:field,value:direction}=query;return[...data].sort(((a,b)=>{const comparison=String(a[field]).localeCompare(String(b[field]));return"asc"===direction?comparison:-comparison}))}checkOperator(operator){return this.operators.find((op=>op===operator))}getOperatorSymbols(){return[...this.operators]}renderHeader(key){const th=document.createElement("th");return th.textContent=key,th}renderCell(value){return String(value)}showMore(key,element,dynamicGrid){throw new GridError("showMore must be implemented by subclass")}}class stringTypePlugin extends TypePlugin{constructor(){super(),this.operators=["%=","=%","*=","!*=","==","!=","in"]}validate(value){return"string"==typeof value}evaluate(query,dataIndexes,data,indices){if(dataIndexes&&indices&&dataIndexes.size<=indices.size)for(const index of dataIndexes.keys())this.evaluateCondition(index,query.operator,query.value)||dataIndexes.get(index).forEach((idx=>indices.delete(idx)));else for(const index of indices)this.evaluateCondition(data[index][query.field],query.operator,query.value)||indices.delete(index);return indices}evaluateCondition(dataValue,operator,value){if("in"===operator&&(value=JSON.parse(value)),Array.isArray(value)&&value.length>0&&"in"===operator)return value.includes(dataValue);switch(operator){case"==":return dataValue===value;case"!=":return dataValue!==value;case"%=":return dataValue.startsWith(value);case"=%":return dataValue.endsWith(value);case"*=":return dataValue.includes(value);case"!*=":return!dataValue.includes(value)}return!1}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){return String(value)}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field].localeCompare(b[field]):"desc"===value?b[field].localeCompare(a[field]):void 0))}showMore(key,element,dynamicGrid){document.querySelectorAll(".context").forEach((e=>e.remove()));const{x:x,y:y}=element.getBoundingClientRect(),items=[{text:"Sort "+key+" ascending",onclick:()=>dynamicGrid.ui.render(dynamicGrid.engine.sort(key,"asc"))},{text:"Sort "+key+" descending",onclick:()=>dynamicGrid.ui.render(dynamicGrid.engine.sort(key,"desc"))},{text:"Unsort "+key,onclick:()=>dynamicGrid.ui.render(dynamicGrid.engine.sort(key,"original"))},null,{text:"Group by "+key,onclick:()=>dynamicGrid.ui.render(dynamicGrid.engine.group(key))},{text:"Un-group",onclick:()=>dynamicGrid.ui.render(dynamicGrid.engine.group())}];new ContextMenu(document.body,items).display(x,y+30)}}class numberTypePlugin extends TypePlugin{constructor(){super(),this.operators=[">","<",">=","<=","==","!=","in"]}validate(value){return!isNaN(Number(value))}evaluate(query,dataIndexes,data,indices){if(dataIndexes&&indices&&dataIndexes.size<=indices.size)for(const index of dataIndexes.keys())this.evaluateCondition(index,query.operator,query.value)||dataIndexes.get(index).forEach((idx=>indices.delete(idx)));else for(const index of indices)this.evaluateCondition(data[index][query.field],query.operator,query.value)||indices.delete(index);return indices}evaluateCondition(dataValue,operator,value){if("in"===operator&&(value=JSON.parse(value)),Array.isArray(value)&&value.length>0&&"in"===operator)return value.includes(dataValue);switch(dataValue=Number(dataValue),operator){case">":return dataValue>value;case"<":return dataValue<value;case">=":return dataValue>=value;case"<=":return dataValue<=value;case"==":return dataValue===value;case"!=":return dataValue!==value}}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const parts=value.toString().split(".");return parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,"."),parts.join(",")}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field]-b[field]:"desc"===value?b[field]-a[field]:void 0))}}class booleanTypePlugin extends TypePlugin{constructor(){super(),this.operators=["==","!="]}validate(value){return"boolean"==typeof value||"string"==typeof value&&("true"===value||"false"===value)}evaluate(query,dataIndexes,data,indices){if(dataIndexes){const allowedValues=dataIndexes.get(query.value);return new Set([...indices].filter((x=>allowedValues.has(x))))}return new Set(data.map(((row,i)=>row[query.field]===query.value?i:null)).filter((x=>null!==x)))}evaluateCondition(dataValue,operator,value){return dataValue===value}sort(query,data){const{field:field,value:value}=query;return data.sort(((a,b)=>"asc"===value?a[field]-b[field]:"desc"===value?b[field]-a[field]:void 0))}renderHeader(key){const elem=document.createElement("th");return elem.innerHTML=key,elem}renderCell(value){const checkbox=document.createElement("input");return checkbox.type="checkbox",value&&checkbox.setAttribute("checked",null),checkbox.disabled=!0,checkbox.style.width="-webkit-fill-available",checkbox.name="checkbox",checkbox.outerHTML}}class QueryParser{constructor(config){this.config={useStrictCase:config.useStrictCase||!1,SymbolsToIgnore:config.SymbolsToIgnore||[" ","_","-"]}}static QUERIES={GROUP:/group\s+(.+)/i,RANGE:/range\s+(-?\d+)-?(-?\d+)?/i,SORT:/sort\s+(.+)\s+(asc|desc)/i,SELECT:/(.+)\s+(\S+)\s+(.+)/i};parseQuery=(query,plugins,headers)=>query.split(/\s+and\s+|\s+&&\s+/i).map((subQuery=>this.parseSubQuery(subQuery.trim(),plugins,headers))).filter((query=>query.queryType));parseSubQuery(subQuery,plugins,headers){subQuery=subQuery.endsWith(" and")?subQuery.slice(0,-4):subQuery;for(const[type,regex]of Object.entries(QueryParser.QUERIES)){const match=regex.exec(subQuery);if(match)return this.parseMatch(match,type,plugins,headers)||{}}return console.warn("Invalid query: "+subQuery+"\nValid queries are: "+Object.keys(QueryParser.QUERIES).join(", ").toLowerCase()),{}}parseMatch(match,type,plugins,headers){if("SELECT"===type){let[_,key,operator,value]=match;key=MeantIndexKey(Object.keys(headers),key,this.config);const pluginType=headers[key],plugin=plugins[pluginType];if(!plugin)throw new GridError("No plugin found for header ("+pluginType+") for key ("+key+")\nDo you know certain that the name of the key is correct?");let field=key,operatorObj=plugin.checkOperator(operator);if(!operatorObj)throw new GridError(this.formatOperatorError(operator,field+" "+operator+" "+value,plugin));if(!plugin.validate(value))return;return{type:pluginType,field:field,operator:operatorObj,value:value,queryType:"SELECT"}}if("SORT"===type){let[_,key,value]=match;const pluginType=headers[key];if(!plugins[pluginType])throw new GridError("No plugin found for header ("+pluginType+") for key ("+key+")");return{type:pluginType,field:key,operator:"sort",value:value,queryType:"SORT"}}if("RANGE"===type){let[_,lower,upper]=match;return void 0===upper&&(upper=lower,lower=0),lower=parseInt(lower),upper=parseInt(upper),{type:"range",lower:lower,upper:upper,queryType:"RANGE"}}if("GROUP"===type){let[_,key]=match;return{type:"group",field:key,queryType:"GROUP"}}return console.warn("Invalid query: "+match+"\nValid queries are: "+Object.keys(QueryParser.QUERIES).join(", ").toLowerCase()),{}}formatOperatorError(operator,field,plugin){return["\n\nInvalid operator:    "+operator,"       For query:    "+field,"     options are:    "+plugin.getOperatorSymbols().join(", "),"\n"].join("\n")}}class SJQLEngine{constructor(engine_config){this.data=[],this.headers=[],this.plugins=[],this.currentQuery={},this.currentQueryStr="",this.QueryParser=new QueryParser(engine_config),this.config={UseDataIndexing:engine_config.UseDataIndexing||!0,useStrictCase:engine_config.useStrictCase||!1,SymbolsToIgnore:engine_config.SymbolsToIgnore||[" ","_","-"]}}createDataIndex(){this.config.UseDataIndexing&&(this.dataIndexes={},Object.keys(this.headers).forEach((header=>{this.dataIndexes[header]=new Map,this.data.forEach(((row,idx)=>{const value=row[header];this.dataIndexes[header].has(value)||this.dataIndexes[header].set(value,new Set),this.dataIndexes[header].get(value).add(idx)}))})))}autoDetectHeaders(data){for(const key of Object.keys(data))!0===data[key]||!1===data[key]?this.headers[key]="boolean":isNaN(data[key])?this.headers[key]="string":this.headers[key]="number"}query(query=""){return this.data&&0!==this.data.length?query?this._query(this.QueryParser.parseQuery(query,this.plugins,this.headers)):(console.warn("No query provided, returning all data"),this.data):(console.warn("No data provided, returning empty array"),[])}_query(query){if(!query||0===query.length)return this.data;const selectQueries=[];let sortQuery=null,rangeQuery=null,groupQuery=null;for(const q of query)switch(q.queryType){case"SELECT":selectQueries.push(q);break;case"SORT":sortQuery=q;break;case"RANGE":rangeQuery=q;break;case"GROUP":groupQuery=q}let validIndices=new Set(this.data.keys()),groupedData=null;for(const q of selectQueries){q.field=MeantIndexKey(Object.keys(this.data[0]),q.field,this.config);const plugin=this.getPlugin(q.type);if(!plugin)throw new GridError(`No plugin found for header (${q.type}) for key (${q.field})`);validIndices=plugin.evaluate(q,this.dataIndexes[q.field],this.data,validIndices)}if(rangeQuery){const first=validIndices.values().next().value,lower=Math.max(0,first+rangeQuery.lower),upper=Math.min(this.data.length-1,first+rangeQuery.upper-1);validIndices=new Set(Array.from({length:upper-lower+1},((_,i)=>i+lower)))}if(groupQuery){const groupField=MeantIndexKey(Object.keys(this.data[0]),groupQuery.field,this.config);groupedData={};for(const index of validIndices){const row=this.data[index],groupKey=row[groupField];(groupedData[groupKey]||=[]).push(row)}if(sortQuery){const sortPlugin=this.getPlugin(sortQuery.type);for(const key in groupedData)groupedData[key]=sortPlugin.sort(sortQuery,groupedData[key])}return console.log(groupedData),groupedData}if(sortQuery){const sortedData=this.data.filter(((_,i)=>validIndices.has(i)));return this.getPlugin(sortQuery.type).sort(sortQuery,sortedData)}return this.data.filter(((_,i)=>validIndices.has(i)))}sort(key,direction){let query="";return 0!==this.currentQueryStr.length||"asc"!==direction&&"desc"!==direction?"asc"===direction||"desc"===direction?query=this.currentQueryStr+" and sort "+key+" "+direction:direction&&""!==direction&&"original"!==direction||(query=this.currentQueryStr):query="sort "+key+" "+direction,this.query(query)}group(key){let query="";return 0===this.currentQueryStr.length?query="group "+key:this.currentQueryStr.length>0?query=this.currentQueryStr+" and group "+key:key&&""!==key&&"original"!==key||(query=this.currentQueryStr),this.query(query)}addPlugin(plugin,dontOverride=!1){if(!(plugin instanceof TypePlugin))throw new GridError("Plugin must extend TypePlugin");const existingPlugin=this.getPlugin(plugin.name,!0);dontOverride&&existingPlugin||(existingPlugin&&!dontOverride?(console.warn("Plugin already exists, removing the old plugin"),this.plugins[plugin.name.replace("TypePlugin","")]=plugin):this.plugins[plugin.name.replace("TypePlugin","")]=plugin)}getPlugin(name,justChecking=!1){if(!name)throw new GridError("Plugin name not provided");if("string"!=typeof name)return!1;const plugin=this.plugins[name.replace("TypePlugin","")];if(!plugin&&!justChecking)throw new GridError("Plugin not found: "+name);return!(!plugin&&justChecking)&&plugin}importData(data,config){if(this.data&&this.data.length>0)throw new GridError("Data already imported, re-importing data is not (yet) supported");if("json"===config.type)this.parseJsonData(data,config);else{if("csv"!==config.type)throw new GridError("Invalid data type");this.parseCSVData(data,config)}0===Object.keys(this.headers).length&&(console.warn("No headers provided, auto detecting headers, please provide so the system can you more optimal plugins"),this.autoDetectHeaders(this.data[0]))}parseJsonData(data,config){if("string"!=typeof data)throw new GridError("Data must be a string (raw JSON)");if(data=JSON.parse(data),!Array.isArray(data))throw new GridError("Data must be an array");if(0===data.length)return console.warn("No data provided"),[];this.data=data.map(((item,index)=>{const newItem={};newItem.internal_id=index;for(const key of Object.keys(item))newItem[key]=item[key];return newItem}))}parseCSVData(data,config){const lines=data.split("\n"),headers=lines[0].split(",").map((header=>header.replace(/"/g,"").replace(" ","_").replace("\r","")));this.data=lines.slice(1).map(((line,index)=>{const values=line.split(/(?!"[a-zA-z0-9\s.()]*)(?:,|,"|",)(?![a-zA-z0-9\s.()]*")/gim),newItem={};return newItem.internal_id=index,headers.forEach(((header,i)=>{"string"==typeof values[i]&&(values[i].endsWith('"')?values[i]=values[i].slice(0,-1):values[i]),newItem[header]=values[i]})),newItem})).slice(0,-1)}}class GridError extends Error{constructor(message){super(message),this.name="GridError",this.stack=""}}function FastHash(object){const string=JSON.stringify(object);let hash=0;for(let i=0;i<string.length;i++)hash=(hash<<5)-hash+string.charCodeAt(i),hash|=0;return hash}function MeantIndexKey(dataIndexesKeys,field,config){return dataIndexesKeys.find((key=>{let normalizedKey="";normalizedKey=config.SymbolsToIgnore.length?key.replace(new RegExp(`[${config.SymbolsToIgnore.join("")}]`,"g"),""):key,config.useStrictCase||(normalizedKey=normalizedKey.toLowerCase());let normalizedField="";return normalizedField=config.SymbolsToIgnore.length?field.replace(new RegExp(`[${config.SymbolsToIgnore.join("")}]`,"g"),""):field,config.useStrictCase||(normalizedField=normalizedField.toLowerCase()),normalizedKey===normalizedField}))}function firstItem(data){if(!data||"object"!=typeof data)return!1;if(Array.isArray(data))return data[0];return data[Object.keys(data)[0]]}function sum(numbers){return numbers.reduce(((acc,num)=>acc+num),0)}Array.prototype.remove=function(entry){const index=this.indexOf(entry);return index>-1&&this.splice(index,1),this};class ContextMenu{#container;#menuDom=null;#isVisible=!1;#isRootMenu=!0;#parentMenu=null;#childMenus=[];#menuItems;constructor(container,items){if(!(container&&container instanceof HTMLElement))throw new Error("Invalid container element");this.#container=container,this.#menuItems=items,this.handleOutsideClick=this.handleOutsideClick.bind(this),document.addEventListener("click",this.handleOutsideClick),this.#installContextMenuStyles()}#installContextMenuStyles(){if(document.getElementById("context-menu-styles"))return;const style=document.createElement("style");style.id="context-menu-styles",style.textContent="\n.context-menu {\n    display: inline-block;\n    position: fixed;\n    top: 0px;\n    left: 0px;\n    min-width: 270px;\n    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n    color: #000;\n    background: #f5f5f5;\n    font-size: 9pt;\n    border: 1px solid #333333;\n    box-shadow: 4px 4px 3px -1px rgba(0, 0, 0, 0.5);\n    padding: 3px 0px;\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    -khtml-user-select: none;\n    -moz-user-select: none;\n    -ms-user-select: none;\n    user-select: none;\n}\n\n.context-menu .menu-item {\n    padding: 4px 19px;\n    cursor: default;\n    color: inherit;\n}\n\n.context-menu .menu-item:hover {\n    background: #e3e3e3 !important;\n}\n\n.context-menu .item:hover .menu-hotkey {\n    color: #000 !important;\n}\n\n.context-menu .menu-item-disabled {\n    color: #878B90 !important;\n}\n\n.context-menu .menu-item-disabled:hover {\n    background: inherit !important;\n}\n\n.context-menu .disabled:hover .menu-hotkey {\n    color: #878B90 !important;\n}\n\n.context-menu .menu-separator {\n    margin: 4px 0px;\n    height: 0;\n    padding: 0;\n    border-top: 1px solid #b3b3b3;\n}\n\n.context-menu .menu-hotkey {\n    color: #878B90;\n    float: right;\n}",document.head.appendChild(style)}handleOutsideClick(event){this.#isVisible&&this.#menuDom&&event.target!==this.#menuDom&&!this.#menuDom.contains(event.target)&&!event.target.closest(".context-menu")&&this.#dismissAllMenus()}#createMenuElement(posX,posY){const menuEl=document.createElement("div");return menuEl.classList.add("context-menu"),menuEl.style.left=`${posX}px`,menuEl.style.top=`${posY}px`,this.#menuItems.forEach((itemData=>{menuEl.appendChild(this.#renderMenuItem(itemData))})),this.#menuDom=menuEl,menuEl}#renderMenuItem(itemData){if(null===itemData){const separator=document.createElement("div");return separator.classList.add("menu-separator"),separator}const itemEl=document.createElement("div");itemEl.classList.add("menu-item");const labelEl=document.createElement("span");labelEl.classList.add("menu-label"),labelEl.textContent=itemData.text?.toString()||"",itemEl.appendChild(labelEl),itemData.disabled?itemEl.classList.add("menu-item-disabled"):itemEl.classList.add("menu-item-active");const hotkeyEl=document.createElement("span");if(hotkeyEl.classList.add("menu-hotkey"),hotkeyEl.textContent=itemData.hotkey?.toString()||"",itemEl.appendChild(hotkeyEl),this.#hasSubItems(itemData)){const subMenuData=itemData.subitems||itemData.submenu,subMenu=subMenuData instanceof ContextMenuHandler?subMenuData:new ContextMenuHandler(this.#container,subMenuData);subMenu.#isRootMenu=!1,subMenu.#parentMenu=this,this.#childMenus.push(subMenu),itemEl.classList.add("has-submenu");const openSubMenu=e=>{if(itemData.disabled)return;this.#hideChildMenus();const subMenuPosX=this.#menuDom.offsetLeft+this.#menuDom.clientWidth+itemEl.offsetLeft,subMenuPosY=this.#menuDom.offsetTop+itemEl.offsetTop;subMenu.#isVisible?subMenu.#hide():subMenu.#show(subMenuPosX,subMenuPosY)};itemEl.addEventListener("click",openSubMenu),itemEl.addEventListener("mousemove",openSubMenu)}else itemEl.addEventListener("click",(e=>{if(this.#hideChildMenus(),!itemEl.classList.contains("menu-item-disabled"))if("function"==typeof itemData.onclick){const eventContext={handled:!1,item:itemEl,label:labelEl,hotkey:hotkeyEl,items:this.#menuItems,data:itemData};itemData.onclick(eventContext),eventContext.handled||this.#hide()}else this.#hide()})),itemEl.addEventListener("mousemove",(()=>{this.#hideChildMenus()}));return itemEl}#hasSubItems(itemData){return itemData.subitems&&Array.isArray(itemData.subitems)&&itemData.subitems.length>0||itemData.submenu&&itemData.submenu instanceof ContextMenuHandler}#dismissAllMenus(){!this.#isRootMenu||this.#parentMenu?this.#parentMenu.#hide():this.#isVisible&&(this.#hideChildMenus(),this.#isVisible=!1,this.#container.removeChild(this.#menuDom),this.#parentMenu&&this.#parentMenu.#isVisible&&this.#parentMenu.#hide())}#hide(){this.#menuDom&&this.#isVisible&&(this.#isVisible=!1,this.#hideChildMenus(),this.#container.removeChild(this.#menuDom),this.#parentMenu&&this.#parentMenu.#isVisible&&this.#parentMenu.#hide()),this.#cleanup()}#hideChildMenus(){this.#childMenus.forEach((submenu=>{submenu.#isVisible&&(submenu.#isVisible=!1,submenu.#container.removeChild(submenu.#menuDom)),submenu.#hideChildMenus()}))}#show(posX,posY){this.#createMenuElement(posX,posY),this.#container.appendChild(this.#menuDom),setTimeout((()=>{this.#isVisible=!0}),0)}#cleanup(){this.#menuDom=null,document.removeEventListener("click",this.handleOutsideClick)}display(posX,posY){return this.#show(posX,posY),this}dismiss(){return this.#hide(),this}getMenuState(){return{container:this.#container,domElement:this.#menuDom,isVisible:this.#isVisible,isRootMenu:this.#isRootMenu,parentMenu:this.#parentMenu,childMenus:this.#childMenus,menuItems:this.#menuItems}}}