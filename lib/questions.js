function curry(f, varargs)
{
	var args = [].slice.call(arguments, 1);
	return function()
	{
		f.apply(this, args.concat([].slice.call(arguments, 0)));
	}
}

function bind(obj, f, varargs)
{
	var args = [].slice.call(arguments, 2);
	return function()
	{
		f.apply(obj, args.concat([].slice.call(arguments, 0)));
	}
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

(function()
{
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
			for(var idx=0; idx < srcList.length; idx++)
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
		for(var idx=0; idx<4; idx++)
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
	}
	
	LP.questionComplete = function(badAnswersExist)
	{
		this.progress.questionAnswered(this.currentPos, !badAnswersExist);
		this.currentPos++;
		this.showQuestion();
	}

	// --------------------------------------------------------------------------------------------

	window.Question = Question;
	window.QuestionList = QuestionList;
})();