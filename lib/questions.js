/* Amateur Radio Practice Test
 * (yes I know, really generic name, come up with a better one later?)
 * http://github.com/odysseus654/amtest
 * Copyright 2012 Erik Anderson
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

(function()
{
	function curry(f, varargs)
	{
		var args = [].slice.call(arguments, 1);
		return function()
		{
			f.apply(this, args.concat([].slice.call(arguments, 0)));
		};
	}
	
	function bind(obj, f, varargs)
	{
		var args = [].slice.call(arguments, 2);
		return function()
		{
			f.apply(obj, args.concat([].slice.call(arguments, 0)));
		};
	}
	
	function fixupQuestions(data)
	{
		for(var id in data.questions)
		{
			var quest = data.questions[id];
			quest.id = id;
			if(quest.fig) quest.fig = data.fig[quest.fig];
		}
	}
	
	function trim(str)
	{
		return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
	
	function shuffle(num)
	{
		var results = [];
		function swap(a,b)
		{
			var temp = results[a];
			results[a] = results[b];
			results[b] = temp;
		}
		
		var idx=0;
		for(idx=0; idx < num; idx++) results[idx]=idx;
		for(idx=0; idx < num-1; idx++)
		{
			var target = Math.random();
			while(target == 1) target = Math.random();
			target = Math.floor(target * (num - idx));
			if(target) swap(idx, target+idx);
		}
		return results;
	}
	
	function createShadow(obj)
	{
		var clone = $(obj).clone()
			.css({position:'absolute', width:$(obj).width()})
			.css($(obj).offset())
			.appendTo(document.body);
		$(obj).css('visibility', 'hidden');
		return clone;
	}
	
	function qsorter(a,b)
	{
		if((a.name.substring(1, 2) == '0') == (b.name.substring(1, 2) == '0'))
		{
			return a.name < b.name ? -1 : a.name > b.name ? +1 : 0;
		} else {
			return a.name.substring(1, 2) == '0' ? +1 : -1;
		}
	}
	
	// -------------------------------------------------------------------------------------------- Question
	
	function Question(list, qid, quest)
	{
		this.list = list;
		this.ID = qid;
		this.question = quest;
		this.domSpot = $('<div/>',{'class':'anscover'});
	}
	var QP = Question.prototype;
	QP.domSpot = null;
	QP.letters = 'ABCD';
	QP.currentHover = null;
	QP.hadBadAnswers = false;
	QP.animate = true;
	
	QP.onMouseMove = function(clsName)
	{
		if(this.currentHover != clsName)
		{
			if(this.currentHover)
			{
				$('.'+this.currentHover, this.domSpot).removeClass('hover');
			}
			this.currentHover = clsName;
			$('.'+this.currentHover, this.domSpot).addClass('hover');
		}
	};
	
	QP.onMouseLeave = function()
	{
		if(this.currentHover)
		{
			$('.'+this.currentHover, this.domSpot).removeClass('hover');
			this.currentHover = null;
		}
	};
	
	QP.onClick = function(ansID, clsName)
	{
		var questRow = $('.'+this.currentHover, this.domSpot);
		if(ansID == this.question.c)
		{
			questRow.addClass('goodAnswer');
			var self = this;
			if(!this.hadBadAnswers)
			{
				if(this.animate)
				{
					this.fadeOut($(this.domSpot).parents('DIV.qouter'), questRow);
					this.list.questionComplete(false);
				} else {
					window.setTimeout(function()
					{
						self.list.questionComplete(false);
					}, 1000);
				}
			}
			else
			{
				window.setTimeout(function()
				{
					self.list.questionComplete(true);
				}, 1000);
			}
		}
		else
		{
			questRow.addClass('badAnswer');
			this.hadBadAnswers = true;
		}
	};
	
	QP.fadeOut = function(obj, rightObj)
	{
		function destroyMe()
		{
			$(this).remove();
		}
		
		if(rightObj)
		{
			var rightClone = createShadow(rightObj);
			rightClone.animate({opacity:0,top:'-=50'},
				{duration:1000, easing:'linear', complete:destroyMe});
		}
		var mainClone = createShadow(obj);
		$(mainClone).animate({opacity:0,left:'-=50'},{duration:500, complete:destroyMe});
	};
	
	QP.buildQuestion = function(container)
	{
		var idx;
		var qouter = $('<div/>',{'class':'qouter'})
			.appendTo(container);
		
		var questHeader = $('<div/>',{'class':'qheader'})
				.append($('<span/>',{'class':'qid'}).append(this.ID));
		if(this.question.note)
		{
			$('<span/>',{'class':'qnote'})
				.appendTo(questHeader)
				.append(this.question.note);
		}
		if(this.question.source)
		{
			var srcList = this.question.source.split(',');
			var srcSpan = $('<span/>',{'class':'qsrc'})
				.append('FCC Part ')
				.appendTo(questHeader);
			for(idx=0; idx < srcList.length; idx++)
			{
				if(idx) srcSpan.append(', ');
				var srcItem = trim(srcList[idx]);
				var matches = /^([0-9\.]+)/.exec(srcItem);
				if(matches)
				{
					srcSpan.append($('<a/>',{target:'blank',href:'http://ecfr.gpoaccess.gov/cgi/t/text/text-idx?type=simple&c=ecfr&cc=ecfr&idno=47&region=DIV1&rgn=Section+Number&q1='+matches[1]})
						.append(srcItem));
				} else {
					srcList.append(srcItem);
				}
			}
		}
		qouter.append(questHeader)
			.append($('<div/>',{'class':'qtitle'}).append(this.question.q))
			.append(this.domSpot);
		
		if(this.question.fig)
		{
			var figouter = $('<div/>',{'class':'figouter'})
				.appendTo(this.domSpot);
			var figdiv = $('<div/>',{'class':'figdiv'})
				.appendTo(figouter);
			var paper = new ScaleRaphael(figdiv.get(0), this.question.fig[0], this.question.fig[1]);
			paper.changeSize($(window).width()*0.4, null, false, false);
			paper.add(this.question.fig.slice(2));
			
			// if you understand the explanation at
			// http://stackoverflow.com/questions/1260122/expand-div-to-take-remaining-width
			// then you are smarter than me
			var anotherWrapper = $('<div/>').css('overflow', 'hidden')
				.appendTo(this.domSpot);
			this.domSpot = anotherWrapper;
		}
		
		var questOrder = shuffle(4);
		for(idx=0; idx<4; idx++)
		{
			var letter = this.letters.substring(idx, idx+1);
			var questRow = $('<table/>',{'class':'ansrow ans'+letter})
					.append($('<tr/>',{'class':'ansinner'})
						.append($('<td/>',{'class':'qleft'}).append(letter))
						.append($('<td/>',{'class':'qright'}).append(this.question.a[questOrder[idx]])))
					.appendTo(this.domSpot);
			questRow.on({
				mousemove:	bind(this, this.onMouseMove, 'ans'+letter),
				mouseout:	bind(this, this.onMouseLeave),
				click:		bind(this, this.onClick, questOrder[idx], 'ans'+letter)
			});
		}
		
		return qouter;
	};
	
	// -------------------------------------------------------------------------------------------- QuestionProgress
	
	function QuestionProgress(container, count)
	{
		this.status = [];
		this.status.length = count;
		this.buildProgress(container);
	}
	var PP = QuestionProgress.prototype;
	PP.status = null;
	PP.numCorrect = 0;
	PP.numFailed = 0;
	PP.colors = {
		'undefined':	'#fff',
		'true':			'#0f0',
		'false':		'#f00'
	};
	
	PP.buildProgress = function(container)
	{
		var progBox = $('<div/>',{'class':'progBox'})
			.appendTo(container);
		this.labelDiv = $('<div/>',{'class':'progLabel'})
			.append($('<div style="float:left">Question <span class="qnum"/> of <span class="qtotal"/> - <span class="qcorr"/> (<span class="pcorr"/>%) Correct</div>'))
			.append($('<div style="float:right"><span class="qrem"/> Remaining</div>'))
			.appendTo(progBox)
			.get(0);
		this.trow = $('<tr/>')
			.appendTo($('<tbody/>')
				.appendTo($('<table/>',{'class':'progress'})
					.appendTo(progBox)))
			.get(0);
		for(var idx=0; idx < this.status.length; idx++)
		{
			var qstatus = this.status[idx];
			$(this.trow).append($('<td/>').css({
				height: '15px',
				'background-color': this.colors[qstatus]
			}));
		}
	};
	
	PP.updateProgress = function()
	{
		if(this.status.length != this.trow.cells.length)
		{
			return this.fullUpdateProgress();
		}

		var numAsked = this.numCorrect + this.numFailed;
		$('SPAN.qnum', this.labelDiv).text(numAsked+1);
		$('SPAN.qtotal', this.labelDiv).text(this.status.length);
		$('SPAN.qcorr', this.labelDiv).text(this.numCorrect);
		$('SPAN.pcorr', this.labelDiv).text(numAsked ? Math.round(10000 * this.numCorrect / numAsked) / 100 : '??');
		$('SPAN.qrem', this.labelDiv).text(this.status.length - numAsked);
	};
	
	PP.fullUpdateProgress = function()
	{
		while(this.status.length > this.trow.cells.length)
		{
			$(this.trow.cells[this.trow.cells.length-1]).remove();
		}
		while(this.status.length < this.trow.cells.length)
		{
			$(this.trow).append($('<td/>').css('height', '15px'));
		}
		this.numCorrect = 0;
		this.numFailed = 0;
		for(var idx=0; idx < this.status.length; idx++)
		{
			var qstatus = this.status[idx];
			if(qstatus === true)
			{
				this.numCorrect++;
			}
			else if(qstatus === false)
			{
				this.numFailed++;
			}
			var tcell = this.trow.cells[idx];
			var color = this.colors[qstatus];
			if($(tcell).css('background-color') != color)
			{
				$(tcell).css('background-color', color);
			}
		}
		var numAsked = this.numCorrect + this.numFailed;
		$('SPAN.qnum', this.labelDiv).text(numAsked+1);
		$('SPAN.qtotal', this.labelDiv).text(this.status.length);
		$('SPAN.qcorr', this.labelDiv).text(this.numCorrect);
		$('SPAN.pcorr', this.labelDiv).text(numAsked ? Math.round(10000 * this.numCorrect / numAsked) / 100 : '??');
		$('SPAN.qrem', this.labelDiv).text(this.status.length - numAsked);
	};
	
	PP.questionAnswered = function(idx, correct)
	{
		var oldStatus = this.status[idx];
		if(oldStatus === true)
		{
			this.numCorrect--;
		}
		else if(oldStatus === false)
		{
			this.numFailed--;
		}
		this.status[idx] = correct;
		if(correct === true)
		{
			this.numCorrect++;
		}
		else if(correct === false)
		{
			this.numFailed++;
		}
		var tcell = this.trow.cells[idx];
		var color = this.colors[correct];
		if($(tcell).css('background-color') != color)
		{
			$(tcell).css('background-color', color);
		}
	};
	
	// -------------------------------------------------------------------------------------------- QuestionList
	
	function QuestionList(base, list)
	{
		this.questBase = $('<div/>').appendTo(base);
		this.progress = new QuestionProgress($('<div/>').appendTo(base), list.length);
		this.list = list;
		this.order = shuffle(list.length);
	}
	
	var LP = QuestionList.prototype;
	LP.currentPos = 0;
	LP.animate = true;
	
	LP.showQuestion = function()
	{
		this.progress.updateProgress();
		var quest = this.list[this.order[this.currentPos]];
		var ui = new Question(this, quest.id, quest);
		ui.animate = this.animate;
		$(this.questBase).empty();
		var dom = ui.buildQuestion(this.questBase);
		if(this.animate)
		{
			//$(dom).css('visibility','hidden');
			var clone = createShadow(dom);
			$(clone).css({opacity:0,left:$(clone).offset().left+50})
				.animate({opacity:1,left:'-=50'},{duration:500, complete:function()
				{
					$(this).remove();
					dom.css('visibility','');
				}});
		}
	};
	
	LP.endOfTest = function()
	{
		this.progress.updateProgress();
		$(this.questBase).empty();
		var failedQuestions = [];
		for(var idx=0; idx < this.progress.status.length; idx++)
		{
			if(this.progress.status[idx] === false)
			{
				var quest = this.list[this.order[idx]];
				failedQuestions.push({name:quest.id,descr:quest.q});
			}
		}
		failedQuestions.sort(qsorter);
		
		$(this.questBase).append('<p>No more questions left</p>' +
			'<p>Questions that got at least one wrong answer:</p>');
		var questBlock = $('<div/>',{'class':'test-results'})
			.appendTo(this.questBase);
		for(var qidx=0; qidx < failedQuestions.length; qidx++)
		{
			var questObj = failedQuestions[qidx];
			$('<span/>',{'class':'question',title:questObj.descr})
				.text(questObj.name)
				.appendTo(questBlock);
		}
	};
	
	LP.questionComplete = function(badAnswersExist)
	{
		this.progress.questionAnswered(this.currentPos, !badAnswersExist);
		this.currentPos++;
		if(this.currentPos >= this.order.length)
		{
			this.endOfTest();
		} else {
			this.showQuestion();
		}
	};
	
	// --------------------------------------------------------------------------------------------
	
	window.curry = curry;
	window.bind = bind;
	window.fixupQuestions = fixupQuestions;
	window.trim = trim;
	window.qsorter = qsorter;
	
	window.Question = Question;
	window.QuestionList = QuestionList;
})();

/* 
Tristate Checkbox v 0.9.2 19th Dec 2008
By Shams Mahmood http://shamsmi.blogspot.com
Heavily modified and/or rewritten by Erik Anderson 
*/
(function()
{
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

(function()
{
	function CategoryCheckbox(params)
	{
		this.questionState = params.questionState;
		this.questId = params.questId;
		var isChecked = false;
		var isUnchecked = false;
		for(var id in this.questionState)
		{
			if(id.substring(0, this.questId.length) == this.questId)
			{
				if(this.questionState[id])
				{
					isChecked = true;
				} else {
					isUnchecked = true;
				}
			}
		}
		params.state = isChecked && isUnchecked ? undefined : isChecked;
		TriStateCheckBox.call(this, params);
		if(!this.numQuestions) this.pullStateFromChildren();
	}
	CategoryCheckbox.prototype = new TriStateCheckBox();
	
	CategoryCheckbox.prototype.setState = function(state)
	{
		TriStateCheckBox.prototype.setState.call(this, state);
		var numQuestionsSelected = this.numQuestionsSelected;
		switch(state)
		{
			case TriStateCheckBox.STATE_ALL:
				numQuestionsSelected = this.numQuestions;
				break;
			case TriStateCheckBox.STATE_NONE:
				numQuestionsSelected = 0;
				break;
		}
		if(numQuestionsSelected !== this.numQuestionsSelected)
		{
			var ourRow = $('SPAN.qcount', $(this.triStateBox).parents('TR'));
			if(ourRow.length)
			{
				if(numQuestionsSelected == this.numQuestions)
				{
					ourRow.text(' (' + this.numQuestions + ' questions selected)');
				} else {
					ourRow.text(' (' + numQuestionsSelected + ' of ' + this.numQuestions + ' questions selected)');
				}
			}
			this.numQuestionsSelected = numQuestionsSelected;
		}
	};
	
	CategoryCheckbox.prototype.pullStateFromChildren = function(bForce)
	{
		var anyBoxes = false;
		var allBoxesSelected = true;
		var allBoxesUnselected = true;
		var numQuestions = 0;
		var numQuestionsSelected = 0;
		for(var id in this.questionState)
		{
			if(id.substring(0, this.questId.length) == this.questId)
			{
				anyBoxes = true;
				numQuestions++;
				if(this.questionState[id])
				{
					allBoxesUnselected = false;
					numQuestionsSelected++;
				} else {
					allBoxesSelected = false;
				}
			}
		}
		if(numQuestionsSelected !== this.numQuestionsSelected)
		{
			var ourRow = $('SPAN.qcount', $(this.triStateBox).parents('TR'));
			if(ourRow.length)
			{
				if(numQuestionsSelected == numQuestions)
				{
					ourRow.text(' (' + numQuestions + ' questions selected)');
				} else {
					ourRow.text(' (' + numQuestionsSelected + ' of ' + numQuestions + ' questions selected)');
				}
			}
			this.numQuestionsSelected = numQuestionsSelected;
			this.numQuestions = numQuestions;
		}
		
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
	
	CategoryCheckbox.prototype.updateImageState = function()
	{
		TriStateCheckBox.prototype.updateImageState.call(this);
		if(this.questId.length > 2)
		{
			switch(this.state)
			{
				case TriStateCheckBox.STATE_ALL:
					this.flagQuestions(true);
					break;
				case TriStateCheckBox.STATE_NONE:
					this.flagQuestions(false);
					break;
			}
		}
	};
	
	CategoryCheckbox.prototype.flagQuestions = function(checked)
	{
		for(var id in this.questionState)
		{
			if(id.substring(0, this.questId.length) == this.questId)
			{
				this.questionState[id] = checked;
			}
		}
	};
	
	window.CategoryCheckbox = CategoryCheckbox;
})();

(function()
{
	function onExpandSection(secId, suppressSection)
	{
		var targets = $('TABLE.sec-choice TR.subof-'+secId);
		var ourRow = $(this).parents('TR');
		if(ourRow.hasClass('collapsed'))
		{
			ourRow.removeClass('collapsed');
			targets.removeClass(suppressSection);
		} else {
			ourRow.addClass('collapsed');
			targets.addClass(suppressSection);
		}
	}
	
	function CategoryList(base, data)
	{
		this.data = data;
		this.base = $(base).get(0);
		this.questionState = {};
	}
	var CL = CategoryList.prototype;
	
	CL.onExpandSubsection = function(secId, suppressSection, subqlist)
	{
		// handle existing secttions
		var targets = $('TABLE.sec-choice TR.subof-'+secId);
		var ourRow = $(this).parents('TR');
		if(ourRow.hasClass('collapsed'))
		{
			ourRow.removeClass('collapsed');
			targets.removeClass(suppressSection);
			
			if(!targets.length)
			{
				// create the section if it doesn't already exist
				var detailRow = $('<tr/>',{'class':'questsection'})
					.addClass('subof-' + secId)
					.addClass('subof-' + secId.substr(0, 2))
					.append($('<td/>'))
					.append($('<td/>'))
					.insertAfter(ourRow);
				var questBlock = $('<td/>')
					.appendTo(detailRow);
				
				var detailCollection = $();
				for(var qidx=0; qidx < subqlist.length; qidx++)
				{
					var questObj = subqlist[qidx];
					var qobj = $('<span/>',{'class':'question',title:questObj.descr})
						.text(questObj.name)
						.appendTo(questBlock);
					
					new CategoryCheckbox({
						box: qobj.get(0),
						questionState: this.questionState,
						questId: questObj.name,
						state: this.questionState[questObj.name]
					});
					detailCollection = detailCollection.add(qobj);
				}
				$('SPAN.tristate', ourRow).triggerHandler('addChildren', {children:detailCollection});
			}
		} else {
			ourRow.addClass('collapsed');
			targets.addClass(suppressSection);
		}
	}
	
	CL.showCategories = function()
	{
		var secCheck = {};
		var secList = [];
		for(var id in this.data.questions)
		{
			var twoChar = id.substring(0,2);
			if(!secCheck[twoChar])
			{
				secCheck[twoChar] = this.data.headers[twoChar];
				secList.push({name:twoChar,descr:this.data.headers[twoChar]});
			}
			secCheck[id.substring(0,3)] = this.data.headers[id.substring(0,3)];
			this.questionState[id] = true;
		}
		secList.sort(qsorter);
		
		var tableObj = $('<tbody/>')
			.appendTo($('<table/>',{'class':'sec-choice'})
				.appendTo(this.base));
		
		var globalRow = $('<tr/>',{'class':'global'})
			.append($('<td/>',{colspan:3})
				.text('Check / Uncheck All')
				.append($('<span class="qcount"></span>')))
			.appendTo(tableObj);
		
		var secCollection = $();
		for(var sec=0; sec < secList.length; sec++)
		{
			var secObj = secList[sec];
			var subList = [];
			for(var id in secCheck)
			{
				if(id.length == 3 && id.substring(0, 2) == secObj.name)
				{
					subList.push({name:id,descr:secCheck[id]});
				}
			}
			var secRow = $('<tr/>',{'class':'section collapsed'})
				.append($('<td/>',{'class':'name'})
					.text(secObj.name)
					.prepend($('<span/>',{'class':'expander'})))
				.append($('<td/>',{colspan:2,'class':'descr'})
					.text(secObj.descr)
					.append($('<span class="qcount"></span>')))
				.appendTo(tableObj);
			
			$('SPAN.expander', secRow).on('click', curry(onExpandSection, secObj.name, 'sec-hidden'));
			
			subList.sort(qsorter);
			var subCollection = $();
			for(var sub=0; sub < subList.length; sub++)
			{
				var subObj = subList[sub];
				var subqlist = [];
				for(var id in this.data.questions)
				{
					if(id.substring(0, 3) == subObj.name)
					{
						subqlist.push({name:id,descr:this.data.questions[id].q});
					}
				}
				var subRow = $('<tr/>',{'class':'subsection collapsed sec-hidden'})
					.addClass('subof-' + secObj.name)
					.append($('<td/>'))
					.append($('<td/>',{'class':'name'})
						.text(subObj.name)
						.prepend($('<span/>',{'class':'expander'})))
					.append($('<td/>',{'class':'descr'})
						.text(subObj.descr)
						.append($('<span class="qcount"></span>')))
					.appendTo(tableObj);
				
				subqlist.sort(qsorter);
				$('SPAN.expander', subRow).on('click',
					bind(this, this.onExpandSubsection, subObj.name, 'sub-hidden', subqlist));
				
				new CategoryCheckbox({
					box: $($('TD', subRow).get(1)),
					questionState: this.questionState,
					questId: subObj.name
				});
				subCollection = subCollection.add(subRow);
			}
			
			new CategoryCheckbox({
				box: $($('TD', secRow).get(0)),
				children: subCollection,
				questionState: this.questionState,
				questId: secObj.name
			});
			secCollection = secCollection.add(secRow);
		}
		
		new CategoryCheckbox({
			box: $($('TD', globalRow).get(0)),
			children: secCollection,
			questionState: this.questionState,
			questId: ''
		});
	}
	
	window.CategoryList = CategoryList;
})();
