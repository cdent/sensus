var socketuri = 'http://tiddlyspace.com:8081';
var currentIndex = 0;
var news;

var host = window.location.host
    ? window.location.host.split('.').slice(1).join('.')
    : 'tiddlyspace.com';

var tiddlerTemplate = [
    '<a href="{{spaceuri}}"><img class="space icon" src="{{spaceicon}}" alt="space"></a>',
    '<a href="{{moduri}}"><img class="mod icon" src="{{modicon}}" alt="{{modifier}}"></a>',
    '<h1><a href="{{uri}}">{{title}}</a></h1>',
    '<h3 class="datetime">{{modified}}</h3>',
    '<ul class="tags">{{#tags}}<li>{{.}}</li>{{/tags}}</ul>',
    '<div class="tcontent">{{{content}}}</div>'].join("");


var tiddlerURL = function(tiddler) {
    return '/bags/' + encodeURIComponent(tiddler.bag) + '/tiddlers/'
        + encodeURIComponent(tiddler.title)
        + '?render=1';
}

var urlFromUser = function(username) {
    return 'http://' + username + '.' + host;
}

var urlFromBag = function(bag) {
    var space = '';
    var index = bag.indexOf('_public');
    if (index >= 0) {
        space = bag.substr(0, index) + '.';
    }
    return 'http://' + space + host;
}

var addNewTiddler = function(tiddler, klass) {
    var spaceURL = urlFromBag(tiddler.bag)
    $.ajax({
        dataType: 'json',
        url: tiddlerURL(tiddler),
        success: function(tiddler) {
            var content = '';
            if (tiddler.render) {
                content = tiddler.render;
                var proccont = $(content).find('a').attr('href',
                    function(index, attribute) {
                        if (!attribute.match(/\//)) {
                            return spaceURL + '/' + attribute;
                        }
                    }).end();
                content = proccont.html();
            } else if (tiddler.type && tiddler.type.match(/^text/)) {
                content = '<pre>'
                    + $('<pre>').text(tiddler.text).html()
                    + '</pre>';
            } else if (tiddler.type && tiddler.type.match(/^image/)) {
                content = '<img src="' + tiddler.uri + '">';
            } else {
                content = '<p>Binary, click title</p>';
            }
            $.extend(tiddler, {
                spaceuri: urlFromBag(tiddler.bag),
                spaceicon: urlFromBag(tiddler.bag) + '/SiteIcon',
                moduri: urlFromUser(tiddler.modifier),
                modicon: urlFromUser(tiddler.modifier) + '/SiteIcon',
                content: content, 
            });
            html = Mustache.to_html(tiddlerTemplate, tiddler);
            var newTiddler = $('<div>');
            newTiddler.append(html);
            newTiddler.addClass('tiddler ' + klass);
            newTiddler.appendTo('#main');
        }
    });
}

var wipeUI = function() {
    $.each(['farleft', 'left', 'center', 'right', 'farright'],
            function(index, value) {
                $('.' + value).remove()
            });
}

var goHome = function() {
    wipeUI();
    addNewTiddler(news.queue[0], 'center');
    addNewTiddler(news.queue[1], 'right');
    addNewTiddler(news.queue[2], 'farright');
    currentIndex = 0;
    $('#message').text(currentIndex + ' ' + news.queue.length);
}

var checkDisplay = function() {
    if (news.queue.length - currentIndex == 2) {
        addNewTiddler(news.queue[news.queue.length -1], 'right');
    } else if (news.queue.length - currentIndex == 3) {
        addNewTiddler(news.queue[currentIndex + 1], 'right');
        addNewTiddler(news.queue[currentIndex + 2], 'farright');
    }
    $('#message').text(currentIndex + ' ' + news.queue.length);
}

var goEnd = function() {
    wipeUI();
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

$('.gohome').click(goHome);
$('.goleft').click(goRight);
$('.goright').click(goLeft);
$('.goend').click(goEnd);
$('.left').on('click', goRight);
$('.right').on('click', goLeft);

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
    } else if (event.which == 69) {
        event.preventDefault();
        event.stopPropagation();
        goEnd();
        return false;
    } else if (event.which == 72) {
        event.preventDefault();
        event.stopPropagation();
        goHome();
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
                    url: data,
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
                goHome();
            }
        });
    },

    push: function(tiddler) {
        this.queue.push(tiddler);
    },

});


var init = function() {
    if (typeof(io) === 'undefined') {
        $('#message')
            .text('Unable to access socket server, functionality limited');
    }

    var search = window.location.search
        ? decodeURIComponent(window.location.search).replace(/^\?/, '').split('|')
        : ['', '*'];
    console.log('search', search);
    var searchquery = search[0];
    var subscription = search[1].split(',');
    
    news = new Tiddlers($('#main'),
            socketuri,
            '/search?q=' + searchquery + ' ' + '_limit:99;sort=modified',
            subscription);
    news.start();
};

$(init);

