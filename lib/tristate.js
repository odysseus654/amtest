/* 
 --- Tristate Checkbox ---
v 0.9.2 19th Dec 2008
By Shams Mahmood
http://shamsmi.blogspot.com

Heavily modified and/or rewritten by Erik Anderson 
*/

(function(){


function onMouseOverImage()
{
	if(!$(this).hasClass('hover')) $(this).addClass('hover');
}

function onMouseOutImage(imageId)
{
	if($(this).hasClass('hover')) $(this).removeClass('hover');
}

function TriStateCheckBox(params)
{
	if(params)
	{
		this.triStateBox = params.box;		// required, the container to prepend the checkbox into
		this.children = params.children;	// optional, a jQuery object desribing the "slaves" of the checkbox
		this.input = params.input;			// optional, a preexisting input tag to submit the value through
		this.permitUserSelectedTristate = !!params.permitUserSelectedTristate;	// optional, default false
		
		var self = this;
		$('<span/>',{'class':'tristate unchecked'})
			.prependTo(this.triStateBox)
			.on({
				mouseover: onMouseOverImage,
				mouseout:  onMouseOutImage,
				click:     function() { self.onTristateImageClick(this); },
				setState:  function(evt, state) { self.setState(state); },
				addChildren: function(evt, children) { self.addChildren(children.children); }
			});
		
		if(this.children)
		{
			$('INPUT[type=checkbox]', this.children)
				.add($('SPAN.tristate'), this.children)
				.on({
					click: function() { self.pullStateFromChildren(); },
					onState: function() { self.pullStateFromChildren(); }
				});
			this.pullStateFromChildren(true);
		}
		else if('state' in params)
		{
			this.state = params.state === true ? TriStateCheckBox.STATE_ALL
				: params.state === false ? TriStateCheckBox.STATE_NONE
				: TriStateCheckBox.STATE_SOME;
			this.updateImageState();
		}
	}
}
TriStateCheckBox.STATE_NONE = 0;
TriStateCheckBox.STATE_ALL = 1;
TriStateCheckBox.STATE_SOME = 2;
TriStateCheckBox.prototype.state = TriStateCheckBox.STATE_NONE;

TriStateCheckBox.prototype.addChildren = function(children)
{
	this.children = $(this.children).add(children);
	var self = this;
	$('INPUT[type=checkbox]', children)
		.add($('SPAN.tristate'), children)
		.on({
			click: function() { self.pullStateFromChildren(); },
			onState: function() { self.pullStateFromChildren(); }
		});
	this.pullStateFromChildren();
};

TriStateCheckBox.prototype.onTristateImageClick = function(img)
{
	var nextState = (this.state+1) % (this.permitUserSelectedTristate ? 3 : 2);
	this.setState(nextState);
};

TriStateCheckBox.prototype.setState = function(state)
{
	if(this.input) $(this.input).get(0).value = state;
	
	if (this.children)
	{
		$('INPUT[type=checkbox]', this.children)
			.each(function()
			{
				this.checked = (state == TriStateCheckBox.STATE_ALL);
			});
		$('SPAN.tristate', this.children)
			.each(function()
			{
				$(this).triggerHandler('setState', (state == TriStateCheckBox.STATE_ALL) ?
					TriStateCheckBox.STATE_ALL : TriStateCheckBox.STATE_NONE);
			});
	}
	
	if(this.state != state)
	{
		this.state = state;
		this.updateImageState();
	}
};

TriStateCheckBox.prototype.pullStateFromChildren = function(bForce)
{
	var anyBoxes = false;
	var allBoxesSelected = true;
	var allBoxesUnselected = true;
	$('INPUT[type=checkbox]', this.children).each(function()
	{
		anyBoxes = true;
		if(this.checked)
		{
			allBoxesUnselected = false;
			if(!allBoxesSelected) return false;
		} else {
			allBoxesSelected = false;
			if(!allBoxesUnselected) return false;
		}
	});
	$('SPAN.tristate', this.children).each(function()
	{
		anyBoxes = true;
		if($(this).hasClass('checked'))
		{
			allBoxesUnselected = false;
		}
		if($(this).hasClass('unchecked'))
		{
			allBoxesSelected = false;
		}
	});
	
	var state = this.state;
	if(anyBoxes)
	{
		state = allBoxesSelected ? TriStateCheckBox.STATE_ALL :
			allBoxesUnselected ? TriStateCheckBox.STATE_NONE :
			TriStateCheckBox.STATE_SOME;
	}
	if(this.state != state || bForce)
	{
		this.state = state;
		this.updateImageState();
	}
};

TriStateCheckBox.prototype.updateImageState = function()
{
	var target = $($('SPAN.tristate', this.triStateBox).get(0));
	
	switch(this.state)
	{
		case TriStateCheckBox.STATE_ALL:
			if(target.hasClass('unchecked')) target.removeClass('unchecked');
			if(!target.hasClass('checked')) target.addClass('checked');
			break;
		case TriStateCheckBox.STATE_NONE:
			if(!target.hasClass('unchecked')) target.addClass('unchecked');
			if(target.hasClass('checked')) target.removeClass('checked');
			break;
		case TriStateCheckBox.STATE_SOME:
			if(!target.hasClass('unchecked')) target.addClass('unchecked');
			if(!target.hasClass('checked')) target.addClass('checked');
			break;
	}
	
	$(target).triggerHandler('onState', this.state);
};

window.TriStateCheckBox = TriStateCheckBox;
})();