var socketuri = 'http://tiddlyspace.com:8081';
var currentIndex = 0;
var news;

var initUI = function() {
    $('#message').text(currentIndex + ' ' + news.queue.length);
    var tiddlerData = news.queue[0];
    var newTiddler = $('<div>');
    newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
    newTiddler.addClass('tiddler center');
    newTiddler.appendTo('#main');
    var tiddlerData = news.queue[1];
    var newTiddler = $('<div>');
    newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
    newTiddler.addClass('tiddler right');
    newTiddler.appendTo('#main');
    var tiddlerData = news.queue[2];
    var newTiddler = $('<div>');
    newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
    newTiddler.addClass('tiddler farright');
    newTiddler.appendTo('#main');
}

var checkDisplay = function() {
    $('#message').text(currentIndex + ' ' + news.queue.length);
    if (news.queue.length - currentIndex == 2) {
        var tiddlerData = news.queue[news.queue.length - 1];
        var newTiddler = $('<div>');
        newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
        newTiddler.addClass('tiddler right');
        newTiddler.appendTo('#main');
    } else if (news.queue.length - currentIndex == 3) {
        var tiddlerData = news.queue[currentIndex + 1];
        var newTiddler = $('<div>');
        newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
        newTiddler.addClass('tiddler right');
        newTiddler.appendTo('#main');
        var tiddlerData = news.queue[currentIndex + 2];
        var newTiddler = $('<div>');
        newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
        newTiddler.addClass('tiddler farright');
        newTiddler.appendTo('#main');
    }
}


var goLeft = function() {
    if (currentIndex < news.queue.length - 1) {
        $('.farleft').remove();
        $('.left').removeClass('left').addClass('farleft');
        $('.center').removeClass('center').addClass('left');
        $('.right').removeClass('right').addClass('center');
        $('.farright').removeClass('farright').addClass('right');
        if (currentIndex < news.queue.length -3) {
            var tiddlerData = news.queue[currentIndex+3];
            var newTiddler = $('<div>');
            newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
            newTiddler.addClass('tiddler farright');
            newTiddler.appendTo('#main');
        }
        currentIndex++;
    }
    $('#message').text(currentIndex + ' ' + news.queue.length);
}

var goRight = function() {
    if (currentIndex > 0) {
        $('.farright').remove();
        $('.right').removeClass('right').addClass('farright');
        $('.center').removeClass('center').addClass('right');
        $('.left').removeClass('left').addClass('center');
        $('.farleft').removeClass('farleft').addClass('left');
        if (currentIndex > 2) {
            var tiddlerData = news.queue[currentIndex-3];
            var newTiddler = $('<div>');
            newTiddler.append('<h1>' + tiddlerData.title + '</h1>');
            newTiddler.addClass('tiddler farleft');
            newTiddler.appendTo('#main');
        }
        currentIndex--;
    }
    $('#message').text(currentIndex + ' ' + news.queue.length);
}

// keyup doesn't work here: screen scrolls
// probably should use switch
$(document).keydown(function(event) {
    if (event.which == 37) {
        event.preventDefault();
        event.stopPropagation();
        goRight();
        return false;
    } else if (event.which == 39) {
        event.preventDefault();
        event.stopPropagation();
        goLeft();
        return false;
    } else if (event.which == 32) {
        event.preventDefault();
        event.stopPropagation();
        while (news.queue.length - currentIndex > 1) {
            goLeft();
        }
        return false;
    }

});

$.ajaxSetup({
    beforeSend: function(xhr) {
                    xhr.setRequestHeader("X-ControlView", "false");
                }
});

var Tiddlers = function(el, socketuri, sourceuri, updater) {

    this.source = sourceuri;
    this.updater = updater;
    if (typeof(io) !== 'undefined') {
        this.socket = io.connect(socketuri,
                {'force new connection': true});
        var self = this;
        this.socket.on('connect', function() {
            $.each(self.updater, function(index, sub) {
                self.socket.emit('unsubscribe', sub);
                self.socket.emit('subscribe', sub);
            });
            self.socket.on('tiddler', function(data) {
                $.ajax({
                    dataType: 'json',
                    url: 'http://tiddlyspace.com' + data,
                    success: function(tiddler) {
                        self.push(tiddler);
                        checkDisplay();
                    }
                });
            });
        });
    }
};

$.extend(Tiddlers.prototype, {
    queue: [],

    start: function() {
        var self = this;
        $.ajax({
            dataType: 'json',
            url: self.source,
            success: function(tiddlers) {
                $.each(tiddlers, function(index, tiddler) {
                    self.push(tiddler);
                });
                initUI();
            }
        });
    },

    push: function(tiddler) {
        console.log('push', tiddler);
        this.queue.push(tiddler);
    },

});


var init = function() {
    if (typeof(io) === 'undefined') {
        $('#message')
            .text('Unable to access socket server, functionality limited');
    }

    news = new Tiddlers($('#main'),
            socketuri,
            'http://tiddlyspace.com/search?q=_limit:99;sort=modified',
            ['*']);
    news.start();
};

$(init);

