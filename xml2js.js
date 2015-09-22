importScripts('../scripts/sax.js');
importScripts('../scripts/assure.js');
self.onmessage = function(e){
	var serializedData = e.data;	
	var x2jc = new xml2jsconverter();
	var p = x2jc.parse(serializedData);
	p.done(function(data){
		//handle progress information
		self.postMessage({
			eventType : data.eventType,
			obj : data.obj,
			status : data.status
		});
	});
	p.fail(function(data){
		self.postMessage({
			obj : data.obj,
			status : data.status
		});
	});
}

var xml2jsconverter = function(){	
	this.data_array = [];
	this.attributes = {};
	this.xmlnodes = [];
	
	this.promise = new assure();
	
	this.textChar = "#";
	this.attributesChar = "@";
	this.childrenChar = ">"
}

var x2jproto = xml2jsconverter.prototype;
x2jproto.parse = function(xmlstring){
	var me = this;
	var p = this.promise = new assure();
	setTimeout(function() {
        var JSON_Array, JSON_string;
		me.showProgress('Process Start');		
		JSON_Array = me.doParse(xmlstring);
		me.showProgress('Process Complete');
		JSON_string = JSON.stringify(JSON_Array);
		p.resolve({
			eventType : 'resolve',
			status : 'success',
			obj : JSON_string
		});
    }, 1000);
	return p;
}
x2jproto.doParse = function(xmlstring){
	var me = this;
	var strict = true, // set to false for html-mode
	parser = sax.parser(strict);
	parser.onerror = me.saxOnError.bind(me)
	parser.ontext = me.saxOnText.bind(me);
	parser.onopentag = me.saxOnOpenTag.bind(me);
	parser.onclosetag = me.saxOnCloseTag.bind(me);	
	parser.onend = me.saxOnEnd.bind(me);
	
	parser.write(xmlstring).close();
	
	return this.data_array;
}

x2jproto.saxOnOpenTag = function(node){
	var children = this.childrenChar;;
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
x2jproto.saxOnEnd = function(){
	this.showProgress('Parsing complete.');
}
x2jproto.saxOnError = function(e){
	this.promise.reject({
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
x2jproto.showProgress = function(msg){
	//assure.js doesnt support promise
	/*if(msg){
		this.promise.progress({
			eventType : 'progress',
			status : 'progress',
			obj : msg
		});
	}*/
}
