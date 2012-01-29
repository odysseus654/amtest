/* dynamic.js
 * Dynamic AJAX retrieval and translation
 * Depends on: Sarissa
 * 
 * Part of EC2 Server Console http://sourceforge.net/ec2servconsole
 * 
 * Copyright 2007-2008 Erik Anderson
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This function can be used to declare JavaScript constructors with nuances that the normal
// prototype-based methodology does not provide for.  Among other things, constructors no longer
// need to handle the empty construction to permit subclassing
// Described at http://www.golimojo.com/etc/js-subclass.html
function subclass(constructor, superConstructor)
{
	function SurrogateConstructor() {}
	SurrogateConstructor.prototype = superConstructor.prototype;

	var prototypeObject = new SurrogateConstructor();
	prototypeObject.constructor = constructor;

	constructor.prototype = prototypeObject;
}

function anonymousPopup(body)
{
	var popup = window.open('about:blank', '_blank');
	if(popup)
	{
		popup.document.write(body);
		popup.document.close();
	}
}

function internalAppError(details,src)
{
	if(!confirm('An unexpected condition occurred in this web page.\n' +
		'This is most likely a bug in the program and may need to be corrected.\n\n' +
		'Details: ' + details + '\n' +
		'Source: ' + src + '\n\n' +
		'Pressing "Cancel" will attempt to drop this program into a debugger, if one is present,\n' +
		'Normal people can push OK'))
	{
		debugger;
	}
}

function serverAppError(url, status, text, body)
{
	if(!confirm('A server error occurred in this web page.\n' +
		'Location: ' + url + '\n' +
		'Code: ' + status + ' (' + text + ')\n' +
		'Pressing "Cancel" will display the full text of the message, if possible,\n' +
		'Normal people can push OK'))
	{
		anonymousPopup(body);
	}
}

function unexpectedResponse(url, text, body)
{
	if(body)
	{
		if(!confirm('The server returned an unexpected response.\n' +
			'Location: ' + url + '\n' +
			'Error: ' + text + '\n' +
			'Pressing "Cancel" will display the full text of the message, if possible,\n' +
			'Normal people can push OK'))
		{
			anonymousPopup(body);
		}
	} else {
		alert('The server returned an unexpected response.\n' +
			'Location: ' + url + '\n' +
			'Error: ' + text + '\n' +
			'No additional information is available');
	}
}

// -----------------------------------------------------------------------------------------------------
// class Promise - abstract class that controls flow of information in an asynchronous environment

function Promise()
{
	this.listeners = [];
}
Promise.prototype = {};
Promise.prototype.value = null;
Promise.prototype.isComplete = false;
Promise.prototype.listeners = null;

// I and every subclass promise that this handler will be called.
//  * If the information is available immediately, it will be called synchronously
//  * If the information is not yet available, it will be called when it becomes available
//  * If the information will not be available or an error occurs, it will be called with null
Promise.prototype.setOnAvail = function(handler)
{
	if(this.isComplete)
	{
		handler(this.value, this);
	} else {
		this.listeners.push(handler);
	}
};

Promise.prototype.abort = function()
{
	if(!this.isComplete)
	{
		this.implSetValue(null);
	}
};

Promise.prototype.cleanup = function()
{
	this.listeners = [];
};

Promise.prototype.implSetValue = function(val)
{
	this.value = val;
	this.isComplete = true;
	for(var idx=0; idx < this.listeners.length; idx++)
	{
		this.listeners[idx](val, this);
	}
	this.cleanup();
};

// -----------------------------------------------------------------------------------------------------
// CompositePromise - fires when all the promises given us are fired

function CompositePromise()		// pass list of promises here
{
	Promise.apply(this);
	this.members = [];
	if(arguments.length)
	{
		this.addPromise(arguments);
	}
}
subclass(CompositePromise, Promise);
CompositePromise.prototype.members = null;
CompositePromise.prototype.value = false;
CompositePromise.prototype.pendingPromise = 0;

CompositePromise.prototype.addPromise = function(prom)
{
	if(!prom) return;
	if('length' in prom)
	{
		this.pendingPromise++;		// prevent premature firing
		for(var idx=0; idx < prom.length; idx++)
		{
			this.addPromise(prom[idx]);
		}
		if(!--this.pendingPromise)
		{
			this.implSetValue(true);	// they are already available
		}
	} else {
		this.members.push(prom);
		this.pendingPromise++;
		var self = this;
		prom.setOnAvail(function()
		{
			if(!--self.pendingPromise)
			{
				self.implSetValue(true);
			}
		});
	}
};

CompositePromise.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	this.members = [];
	this.pendingPromise = 0;
};

CompositePromise.prototype.abort = function()
{
	for(var idx=0; idx < this.members.length; idx++)
	{
		this.members[idx].abort();
	}

	Promise.prototype.abort.apply(this);
};

// -----------------------------------------------------------------------------------------------------
// AjaxQuery - asynchronous url queries

// var queryReq = {
//	url: 'the url to retrieve',
//	method: 'GET or POST',
//	params:	'query string or body',
//	headers:	{ key1: 'val1', key2: 'val2', key3: 'val3'}
// };
function AjaxQuery(req,handler)
{
	Promise.apply(this);
	if(handler) this.setOnAvail(handler);

	var self = this;
	this.xmlhttp = new XMLHttpRequest();
	
	this.xmlhttp.onreadystatechange = function()
	{
		if(!self.xmlhttp)
		{
			self.implSetValue(null);
		}
		else if(self.xmlhttp.readyState == 4)
		{
			self.implSetValue(self.xmlhttp);
		}
	};
	
	var method, params, url;
	params = req.params;
	url = req.url;
	if(req.method && req.method.toLowerCase() == 'post')
	{
		method = 'POST';
		if(!params) params = '';
	} else {
		method = 'GET';
		if(params) url += '?' + params;
		params = '';
	}
	try {
		this.xmlhttp.open(method, url, true);
	}
	catch(e)
	{
		internalAppError('Unexpected error opening connection to ' + url + ': ' + e.message, 'AjazQuery');
		this.implSetValue(null);
		return;
	}

	if(req.headers)
	{
		var key;
		for(key in req.headers)
		{
			this.xmlhttp.setRequestHeader(key, req.headers[key]);
		}
	}

	this.xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	this.xmlhttp.setRequestHeader('X-Ajax-Engine', 'Sarissa/' + Sarissa.VERSION);
	this.xmlhttp.setRequestHeader('Content-length', params.length);
	
	if(method == 'POST')
	{
		this.xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		this.xmlhttp.setRequestHeader('Connection', 'close');
	} else {
		this.xmlhttp.setRequestHeader('If-Modified-Since', 'Sat, 1 Jan 2000 00:00:00 GMT');
	}
	this.xmlhttp.send(params);
}
subclass(AjaxQuery, Promise);
AjaxQuery.prototype.xmlhttp = null;

AjaxQuery.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	if(this.xmlhttp)
	{
		try {
			this.xmlhttp.onreadystatechange = function(){};	// no local variables, no ties to anything other than this function def?
		} catch(e) {}
		this.xmlhttp = null;
	}
};

AjaxQuery.prototype.abort = function()
{
	if(this.xmlhttp)
	{
		try {
			this.xmlhttp.abort();
		} catch(e) {}
	}
	Promise.prototype.abort.apply(this);
};

// -----------------------------------------------------------------------------------------------------
// XmlAjaxQuery - asynchronous XML retrieval

// var queryReq = {
//	url: 'the url to retrieve',
//	method: 'GET or POST',
//	params:	'query string or body',
//	headers:	{ key1: 'val1', key2: 'val2', key3: 'val3'}
// };
function XmlAjaxQuery(req,handler)
{
	Promise.apply(this);
	if(handler) this.setOnAvail(handler);

	var self = this;
	this.url = req.url;
	this.xmlhttp = new AjaxQuery(req,function(xmlhttp)
	{
		self.onLoaded(xmlhttp);
	});
}
subclass(XmlAjaxQuery, Promise);
XmlAjaxQuery.prototype.xmlhttp = null;
XmlAjaxQuery.prototype.url = null;

XmlAjaxQuery.prototype.onLoaded = function(xmlhttp)
{
	if(!xmlhttp)
	{
		this.implSetValue(null);
	}
	else if(xmlhttp.status != 200)
	{
		serverAppError(this.url, xmlhttp.status, xmlhttp.statusText, xmlhttp.responseText);
		this.implSetValue(null);
	}
	else if(xmlhttp.responseXML && xmlhttp.responseXML.documentElement && xmlhttp.responseXML.documentElement.children
		 && xmlhttp.responseXML.documentElement.children.length)
	{
		this.implSetValue(xmlhttp.responseXML);
	}
	else
	{
		this.implSetValue(XmlAjaxQuery.parse(xmlhttp.responseText, this.url));
	}
};

XmlAjaxQuery.parse = function(text, url)
{
	var parser = new DOMParser();
	var xml = parser.parseFromString(text, 'text/xml');
	var err = Sarissa.getParseErrorText(xml);
	if(err == Sarissa.PARSED_OK) return xml;

	if(url)
	{
		unexpectedResponse(url, 'Parse error: ' + err, text);
	} else {
		internalAppError('Parse error: ' + err, text);
	}
	return null;
};

XmlAjaxQuery.prototype.abort = function()
{
	if(this.xmlhttp)
	{
		this.xmlhttp.abort();
	}
	Promise.prototype.abort.apply(this);
};

XmlAjaxQuery.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	this.xmlhttp = null;
};

// -----------------------------------------------------------------------------------------------------
// CachedXmlAjaxQuery - cached asynchronous XML retrieval

var XML_CACHE = {};
function CachedXmlAjaxQuery(url,handler)
{
	this.url = url;
	var cacheVal = XML_CACHE[url];
	if(cacheVal)
	{
		if(typeof cacheVal == 'object' && cacheVal instanceof CachedXmlAjaxQuery)
		{		// we have an in-progress query on this url, return that object instead of us
			if(handler) cacheVal.setOnAvail(handler);
			return cacheVal;
		} else {	// we have previously queried and returned results, don't issue our own query
			Promise.apply(this);
			if(handler) this.setOnAvail(handler);
			Promise.prototype.implSetValue.apply(this, [XML_CACHE[url]]);
		}
	} else {		// we are now the active query for this url
		XML_CACHE[url] = this;
		XmlAjaxQuery.apply(this, [{url: url, method: 'GET'}, handler]);
	}
}
subclass(CachedXmlAjaxQuery, XmlAjaxQuery);

CachedXmlAjaxQuery.prototype.implSetValue = function(val)
{
	XML_CACHE[this.url] = val;
	Promise.prototype.implSetValue.apply(this, arguments);
};

// -----------------------------------------------------------------------------------------------------
// TemplateQuery - asynchronous XSLT template retrieval

var XSLT_CACHE = {};
function TemplateQuery(url,handler)
{
	Promise.apply(this);
	this.url = url;
	var cacheVal = XSLT_CACHE[url];
	if(cacheVal)
	{
		if(typeof cacheVal == 'object' && cacheVal instanceof TemplateQuery)
		{		// we have an in-progress query on this url, return that query object instead of ours
			if(handler) cacheVal.setOnAvail(handler);
			return cacheVal;
		} else {	// we have previously queried and returned results, don't issue our own query
			if(handler) this.setOnAvail(handler);
			Promise.prototype.implSetValue.apply(this, [cacheVal]);
		}
	} else {		// we are now the active query for this url
		var self = this;
		XSLT_CACHE[url] = this;
		if(handler) this.setOnAvail(handler);
		this.xmlSource = new CachedXmlAjaxQuery(url,function(xml)
		{
			self.onLoaded(xml);
		});
	}
}
subclass(TemplateQuery, Promise);
TemplateQuery.prototype.xmlSource = null;
TemplateQuery.prototype.url = null;

TemplateQuery.prototype.onLoaded = function(xml)
{
	if(!xml)
	{
		this.implSetValue(null);
	} else {
		var style = new XSLTProcessor();
		try {
			style.importStylesheet(xml);
		} catch(e) {
			unexpectedResponse(this.url, 'Template compile error: ' + e.message, (new XMLSerializer()).serializeToString(xml));
			style = null;
		}
		this.implSetValue(style);
	}
};

TemplateQuery.prototype.implSetValue = function(val)
{
	XSLT_CACHE[this.url] = val;
	Promise.prototype.implSetValue.apply(this, arguments);
};

TemplateQuery.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	this.xmlSource = null;
};

TemplateQuery.transform = function(xslt, xml, parms)
{
	if(!xslt || !xml) return null;

	if(typeof xml == 'string')
	{
		xml = XmlAjaxQuery.parse(xml);
		if(!xml) return null;
	}

	xslt.clearParameters();
	if(parms)
	{
		var key;
		for(key in parms)
		{
			xslt.setParameter('', key, parms[key]);
		}
	}

	try {
		return xslt.transformToFragment(xml, document);
	} catch(e) {
		unexpectedResponse(null, 'Template execution error: ' + e.message, (new XMLSerializer()).serializeToString(xml));
		return null;
	}
};

// -----------------------------------------------------------------------------------------------------
// TransformedAjaxCommand - Retrieve an XSLT query and transform it by a specified command

function TransformedAjaxCommand(xslt, xml, templParms, handler)
{
	Promise.apply(this);
	if(handler) this.setOnAvail(handler);

	var self = this;
	this.xsltSource = new TemplateQuery(xslt, function(xslt)
	{
		self.onLoaded(xslt, xml);
	});
}
subclass(TransformedAjaxCommand, Promise);
TransformedAjaxCommand.prototype.xslt = null;
TransformedAjaxCommand.prototype.xsltSource = null;

TransformedAjaxCommand.prototype.onLoaded = function(xslt, xml, templParms)
{
	this.xslt = xslt;
	if(xml && this.xslt)
	{
		this.implSetValue(TemplateQuery.transform(this.xslt, xml, templParms));
	} else {
		this.implSetValue(null);
	}
};

TransformedAjaxCommand.prototype.abort = function()
{
	if(this.xsltSource)
	{
		this.xsltSource.abort();
	}
	Promise.prototype.abort.apply(this);
};

TransformedAjaxCommand.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	this.xsltSource = null;
};

// -----------------------------------------------------------------------------------------------------
// TransformedAjaxQuery - Retrieve an XML and XSLT query and transform the XML by the XSLT

// var queryReq = {
//	url: 'the url to retrieve',
//	method: 'GET or POST',
//	params:	'query string or body',
//	headers:	{ key1: 'val1', key2: 'val2', key3: 'val3'},
//	templParms:	{ key1: 'val1', key2: 'val2', key3: 'val3'}
// };
function TransformedAjaxQuery(xslt, req, handler)
{
	Promise.apply(this);
	if(handler) this.setOnAvail(handler);

	this.templParms = req.templParms;
	var self = this;
	this.xsltSource = new TemplateQuery(xslt, function(xslt)
	{
		self.xslt = xslt;
	});
	
	this.xmlSource = new XmlAjaxQuery(req, function(xml)
	{
		self.xml = xml;
	});
	
	this.compSource = new CompositePromise(this.xsltSource, this.xmlSource);
	this.compSource.setOnAvail(function()
	{
		self.onLoaded();
	});
}
subclass(TransformedAjaxQuery, Promise);
TransformedAjaxQuery.prototype.xml = null;
TransformedAjaxQuery.prototype.xslt = null;
TransformedAjaxQuery.prototype.xmlSource = null;
TransformedAjaxQuery.prototype.xsltSource = null;
TransformedAjaxQuery.prototype.compSource = null;
TransformedAjaxQuery.prototype.templParms = null;

TransformedAjaxQuery.prototype.onLoaded = function()
{
	if(this.xml && this.xslt)
	{
		this.implSetValue(TemplateQuery.transform(this.xslt, this.xml, this.templParms));
	} else {
		this.implSetValue(null);
	}
};

TransformedAjaxQuery.prototype.rerender = function()
{
	if(!this.xml || !this.xslt) return null;
	return TemplateQuery.transform(this.xslt, this.xml, this.templParms);
};

TransformedAjaxQuery.prototype.abort = function()
{
	if(this.compSource)
	{
		this.compSource.abort();
	}
	Promise.prototype.abort.apply(this);
};

TransformedAjaxQuery.prototype.cleanup = function()
{
	Promise.prototype.cleanup.apply(this);

	// drop any references so we can garbage collect as much as we can
	this.xmlSource = null;
	this.xsltSource = null;
	this.compSource = null;
};

// -----------------------------------------------------------------------------------------------------
// XMLtoJS - utility function to attempt to translate an XML document into a JS object

function xmlToJS(node)
{
	if(node.nodeType == Node.COMMENT_NODE || node.nodeType == Node.PROCESSING_INSTRUCTION_NODE)
	{
		return null;	// ignore comments unconditionally
	}

	if(node.nodeType == Node.TEXT_NODE || node.nodeType == Node.CDATA_SECTION_NODE)
	{
		return node.nodeValue
	}

	var bodyText = '';
	var thisObj = {};
	var idx;

	if(node.attributes)
	{
		for(idx=0; idx < node.attributes.length; idx++)
		{
			var attr = node.attributes.item(idx);
			thisObj['@' + attr.nodeName] = attr.nodeValue;
		}
	}

	if(node.childNodes)
	{
		for(idx=0; idx < node.childNodes.length; idx++)
		{
			var child = node.childNodes[idx];
			var childVal = xmlToJS(child);
			if(typeof childVal == 'string')
			{
				bodyText += childVal;
			}
			else if(childVal)
			{
				thisObj[child.nodeName] = childVal;
			}
		}
	}

	if(bodyText)
	{
		thisObj._body = bodyText;
	}

	return thisObj;
}