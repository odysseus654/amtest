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
			setState:  function(evt, state) { self.setState(state); }
		});
	
	if(this.children)
	{
		$('INPUT[type=checkbox]', this.children)
			.add($('SPAN.tristate'), this.children)
			.on('click', function() { self.pullStateFromChildren(); });
		this.pullStateFromChildren();
	}
}
TriStateCheckBox.STATE_NONE = 0;
TriStateCheckBox.STATE_ALL = 1;
TriStateCheckBox.STATE_SOME = 2;
TriStateCheckBox.prototype.state = TriStateCheckBox.STATE_NONE;

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
	
	this.state = state;
	this.updateImageState();
};

TriStateCheckBox.prototype.pullStateFromChildren = function()
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
		} else {
			allBoxesSelected = false;
		}
	});
	$('SPAN.tristate', this.children).each(function()
	{
		anyBoxes = true;
		if($(this).hasClass('checked'))
		{
			allBoxesUnselected = false;
		}
		else if($(this).hasClass('unchecked'))
		{
			allBoxesSelected = false;
		}
		else if($(this).hasClass('indeterminate'))
		{
			allBoxesSelected = false;
			allBoxesUnselected = false;
		}
	});
	
	if(anyBoxes)
	{
		this.state = allBoxesSelected ? TriStateCheckBox.STATE_ALL :
			allBoxesUnselected ? TriStateCheckBox.STATE_NONE :
			TriStateCheckBox.STATE_SOME;
	}
	this.updateImageState();
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
};

window.TriStateCheckBox = TriStateCheckBox;
})();