function execute() {
    var current = $('.command.current');
    $(current).find('.prompt').find('.blinking-cursor').hide();
    $(current).children('.content').show();
}
function next(delay) {
    setTimeout(function() {
        var current = $('.command.current').removeClass('current');
        $(current).next('.command').addClass('current').removeClass('hidden');
    }, 100);
}
$(document).ready(function() {
    $('.command').each(function(i) {
        var delay = ((i + 1) * 3000);

        setTimeout(function() {
            execute();
            next(delay);
        }, delay);
    });
});
