var socketuri = 'http://tiddlyspace.com:8081';
var currentIndex = 0;
var news;

var tiddlerURL = function(tiddler) {
    return 'http://tiddlyspace.com' + '/bags/'
        + encodeURIComponent(tiddler.bag) + '/tiddlers/'
        + encodeURIComponent(tiddler.title)
        + '?render=1';
}

var addNewTiddler = function(tiddler, klass) {
    $.ajax({
        dataType: 'json',
        url: tiddlerURL(tiddler),
        success: function(tiddler) {
            var newTiddler = $('<div>');
            var header = $('<h1>');
            var link = $('<a>').attr({href: tiddler.uri,
                title: tiddler.title,
                target: '_blank'}).text(tiddler.title);
            header.append(link).appendTo(newTiddler);
            var content = $('<div>');
            if (tiddler.render) {
                content.html(tiddler.render);
            } else if (tiddler.type && tiddler.type.match(/^text/)) {
                var pre = $('<pre>').text(tiddler.text);
                content.append(pre);
            } else if (tiddler.type && tiddler.type.match(/^image/)) {
                content.html('<img src="' + tiddler.uri + '">');
            } else {
                content.html('<p>Binary, click title</p>');
            }
            content.addClass('tcontent');
            newTiddler.append(content);
            newTiddler.addClass('tiddler ' + klass);
            newTiddler.appendTo('#main');
        }
    });
}


var initUI = function() {
    $('#message').text(currentIndex + ' ' + news.queue.length);
    addNewTiddler(news.queue[0], 'center');
    addNewTiddler(news.queue[1], 'right');
    addNewTiddler(news.queue[2], 'farright');
}

var checkDisplay = function() {
    $('#message').text(currentIndex + ' ' + news.queue.length);
    if (news.queue.length - currentIndex == 2) {
        addNewTiddler(news.queue[news.queue.length -1], 'right');
    } else if (news.queue.length - currentIndex == 3) {
        addNewTiddler(news.queue[currentIndex + 1], 'right');
        addNewTiddler(news.queue[currentIndex + 2], 'farright');
    }
}

var goEnd = function() {
    $.each(['farleft', 'left', 'center', 'right', 'farright'],
            function(index, value) {
                $('.' + value).remove()
            });
    currentIndex = news.queue.length - 1;
    addNewTiddler(news.queue[currentIndex], 'center');
    addNewTiddler(news.queue[currentIndex - 1], 'left');
    addNewTiddler(news.queue[currentIndex - 2], 'farleft');
    $('#message').text(currentIndex + ' ' + news.queue.length);
}

var goLeft = function() {
    if (currentIndex < news.queue.length - 1) {
        $('.farleft').remove();
        $('.left').removeClass('left').addClass('farleft');
        $('.center').removeClass('center').addClass('left');
        $('.right').removeClass('right').addClass('center');
        $('.farright').removeClass('farright').addClass('right');
        if (currentIndex < news.queue.length -3) {
            addNewTiddler(news.queue[currentIndex + 3], 'farright')
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
            addNewTiddler(news.queue[currentIndex - 3], 'farleft')
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
        goEnd();
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

