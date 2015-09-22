importScripts('../scripts/sax.js');
self.onmessage = function(e){
	var serializedData = e.data;
	var parentNode;
	var level = -1;
	
	var x2jc = new xml2jsconverter();
	try{
		//replace cdata
		serializedData = serializedData.replace(/<!--\[/g, "<![");
		serializedData = serializedData.replace(/\]\]-->/g, "]]>");
	
		var jsonArray = x2jc.parse(serializedData);
		var JSON_string = JSON.stringify(jsonArray);
		self.postMessage({
			obj : JSON_string,
			status : 'success'
		});
	}
	catch(e){
		self.postMessage({
			error : e.message,
			status : 'error'
		});
	}
}

var xml2jsconverter = function(){	
	this.data_array = [];
	this.cdataText = [];
	
	this.textChar = "#";
	this.attributesChar = "@";
	this.childrenChar = ">"
}

var x2jproto = xml2jsconverter.prototype;
x2jproto.parse = function(xmlstring){
	var me = this;
	var strict = true, // set to false for html-mode
	parser = sax.parser(strict);
	parser.onerror = me.saxOnError.bind(me)
	parser.ontext = me.saxOnText.bind(me);
	parser.onopencdata = me.saxOnOpenCData.bind(me);
	parser.oncdata = me.saxOnCData.bind(me);
	parser.onclosecdata = me.saxOnCloseCData.bind(me);
	parser.onopentag = me.saxOnOpenTag.bind(me);
	parser.onclosetag = me.saxOnCloseTag.bind(me);	
	parser.onend = me.saxOnEnd.bind(me);
	
	parser.write(xmlstring).close();
	
	return this.data_array;
}

x2jproto.saxOnOpenTag = function(node){
	var children = this.childrenChar;
	this.level++;
	var curNode = {
		name : node.name,		
		isPopulated : false,
		//attributes : []
	};
	curNode[children] = [];
	//add attributes
	if(node.attributes){
		c = curNode[this.attributesChar] = [];
		for(var attr in node.attributes){
			c.push({
				name : attr, value : node.attributes[attr]
			});
		}
	}
	
	var lastNode = this.getLastNode();
	if(lastNode && lastNode[children]){
		lastNode[children].push(curNode);		
	}
	else{
		this.data_array.push(curNode);
	}
}
x2jproto.saxOnCloseTag = function(node){
	var children = this.childrenChar;
	var c = this.getLastNode();
	if(c){
		delete c.isPopulated;
		var a = this.attributesChar;
		if(c[children] && c[children].length === 0){
			delete c[children];
		}
		if(c[a] && c[a].length === 0){
			delete c[a];
		}
	}
}
x2jproto.saxOnText = function(text){
	var lastNode = this.getLastNode();
	if(text.trim()){
		lastNode[this.textChar] = text.trim();
	}
}
x2jproto.saxOnCData = function(cdata){
	if(cdata && cdata.trim()){
		this.cdataText = [cdata.trim()];
	}
}
x2jproto.saxOnOpenCData = function(e){
	this.cdataText = null;
	this.cdataText = [];
}
x2jproto.saxOnCloseCData = function(e){
	if(this.cdataText && this.cdataText.length > 0){
		var lastNode = this.getLastNode();
		lastNode[this.textChar] = this.cdataText.join(' ');
	}
	
	this.cdataText = null;
	this.cdataText = [];
}
x2jproto.saxOnEnd = function(){
	self.postMessage({
		msg : 'Parsing complete.',
		status : 'success'
	});
}
x2jproto.saxOnError = function(e){
	self.postMessage({
		error : e,
		status : 'error'
	});
}
x2jproto.getLastNode = function(){
	var children = this.childrenChar;
	//get the last node of the array
	var nodeid = this.data_array.length - 1;
	if(nodeid < 0){
		nodeid = 0;
	}
	var prevNode = lastNode = this.data_array[nodeid] || [];
	while(lastNode){
		if(lastNode && lastNode.isPopulated === false){
			childNodes = lastNode[children];
			if(childNodes && childNodes.length > 0){
				prevNode = lastNode;
				lastNode = childNodes[childNodes.length - 1];				
			}
			else{
				break;
			}
		}
		else{
			lastNode = prevNode;
			break;
		}
	}
	return lastNode;
}
