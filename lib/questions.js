function curry(f, varargs)
{
	var args = [].splice.call(arguments, 0);
	args.shift();
	return function()
	{
		f.apply(this, args.concat([].splice.call(arguments, 0)));
	}
}

function bind(obj, f, varargs)
{
	var args = [].splice.call(arguments, 0);
	args.splice(0, 2);
	return function()
	{
		f.apply(obj, args.concat([].splice.call(arguments, 0)));
	}
}

function fixupQuestions(data)
{
	for(var id in data.questions)
	{
		var quest = data.questions[id];
		if(quest.fig) quest.fig = data.fig[quest.fig];
	}
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
			.css($(obj).offset());
		$(document.body).append(clone);
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
		$(mainClone).animate({opacity:0,left:'-=50'},{complete:destroyMe});
	};

	QP.buildQuestion = function(container)
	{
		var qouter = $('<div/>',{'class':'qouter'});
		container.append(qouter);
		
		var questHeader = $('<div/>',{'class':'qheader'})
				.append($('<span/>',{'class':'qid'}).append(this.ID));
		if(this.question.source)
		{
			questHeader.append($('<span/>',{'class':'qsrc'}).append(this.question.source));
		}
		qouter.append(questHeader)
			.append($('<div/>',{'class':'qtitle'}).append(this.question.q))
			.append(this.domSpot);

		if(this.question.fig)
		{
			var figouter = $('<div/>',{'class':'figouter'});
			var figdiv = $('<div/>',{'class':'figdiv'});
			figouter.append(figdiv);
			this.domSpot.append(figouter);
			var paper = new ScaleRaphael(figdiv.get(0), this.question.fig[0], this.question.fig[1]);
			paper.changeSize($(window).width()*0.4, null, false, false);
			paper.add(this.question.fig.slice(2));
			
			// if you understand the explanation at
			// http://stackoverflow.com/questions/1260122/expand-div-to-take-remaining-width
			// then you are smarter than me
			var anotherWrapper = $('<div/>').css({overflow:'hidden'});
			this.domSpot.append(anotherWrapper);
			this.domSpot = anotherWrapper;
		}

		var questOrder = shuffle(4);
		for(var idx=0; idx<4; idx++)
		{
			var letter = this.letters[idx];
			var questRow = $('<table/>',{'class':'ansrow ans'+letter})
					.append($('<tr/>',{'class':'ansinner'})
						.append($('<td/>',{'class':'qleft'}).append(letter))
						.append($('<td/>',{'class':'qright'}).append(this.question.a[questOrder[idx]])));
			questRow.on({
				mousemove:	bind(this, this.onMouseMove, 'ans'+letter),
				mouseout:	bind(this, this.onMouseLeave),
				click:		bind(this, this.onClick, questOrder[idx], 'ans'+letter)
			});
			this.domSpot.append(questRow);
		}
		
		return qouter;
	};
	
	// -------------------------------------------------------------------------------------------- QuestionList

	function QuestionList(base, list)
	{
		this.base = base;
		this.list = list;
		this.order = shuffle(list.length);
	}
	
	var LP = QuestionList.prototype;
	LP.currentPos = 0;
	LP.animate = true;
	
	LP.showQuestion = function()
	{
		var quest = this.list[this.order[this.currentPos]];
		var ui = new Question(this, quest.id, quest);
		ui.animate = this.animate;
		$(this.base).empty();
		var dom = ui.buildQuestion(this.base);
		if(this.animate)
		{
			//$(dom).css('visibility','hidden');
			var clone = createShadow(dom);
			$(clone).css({opacity:0,left:$(clone).offset().left+50})
				.animate({opacity:1,left:'-=50'},{complete:function()
				{
					$(this).remove();
					dom.css('visibility','');
				}});
		}
	}
	
	LP.questionComplete = function(badAnswersExist)
	{
		this.currentPos++;
		this.showQuestion();
	}

	// --------------------------------------------------------------------------------------------

	window.Question = Question;
	window.QuestionList = QuestionList;
})();