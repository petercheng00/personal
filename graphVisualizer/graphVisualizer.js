
var gv = (function() {
    var init = function() {
        graphDraw.init();
        graphLogic.init();
        //allow draw now
        //user click submit
        //disallow draw

        console.log('gv init finished');
    }
    return {
        init: init
    };
})();

if(window.addEventListener) {
    window.addEventListener('load', gv.init(), false);
}
