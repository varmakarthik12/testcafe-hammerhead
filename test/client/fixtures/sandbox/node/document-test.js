var processScript    = hammerhead.get('../processing/script').processScript;
var INTERNAL_LITERAL = hammerhead.get('../processing/script/internal-literal');

var browserUtils  = hammerhead.utils.browser;
var nativeMethods = hammerhead.nativeMethods;
var iframeSandbox = hammerhead.sandbox.iframe;

QUnit.testStart(function () {
    // NOTE: The 'window.open' method used in QUnit.
    window.open       = nativeMethods.windowOpen;
    window.setTimeout = nativeMethods.setTimeout;
    iframeSandbox.on(iframeSandbox.IFRAME_READY_TO_INIT_EVENT, initIframeTestHandler);
    iframeSandbox.off(iframeSandbox.IFRAME_READY_TO_INIT_EVENT, iframeSandbox.iframeReadyToInitHandler);
});

QUnit.testDone(function () {
    iframeSandbox.off(iframeSandbox.IFRAME_READY_TO_INIT_EVENT, initIframeTestHandler);
});

test('document.write for iframe.src with javascript protocol', function () {
    var $div = $('<div>').appendTo('body');

    overrideDomMeth($div[0]);

    var $iframe = $('<iframe id="test4" src="javascript:&quot;<html><body><a id=\'link\' href=\'http://google.com/\'></body></html>&quot;"></iframe>"');

    $div[0].appendChild($iframe[0]);
    ok($iframe[0].contentDocument.write.toString() !== nativeMethods.documentWrite.toString());

    $iframe.remove();
});

asyncTest('document.write for iframe with empty url', function () {
    var $div   = $('<div>').appendTo('body');
    var cheked = false;

    overrideDomMeth($div[0]);

    var $iframe = $('<iframe id="test3" src="about:blank">"');

    var check = function () {
        var document = $iframe[0].contentDocument;

        if (document)
            ok(document.write.toString() !== nativeMethods.documentWrite.toString());
    };

    check();

    $iframe.ready(check);
    $iframe.load(function () {
        check();

        var id = setInterval(function () {
            if (cheked) {
                clearInterval(id);
                $iframe.remove();
                start();
            }
        }, 10);

    });

    $div[0].appendChild($iframe[0]);
    check();
    cheked    = true;
});

if (!browserUtils.isFirefox) {
    test('override document after document.write calling', function () {
        var $div    = $('<div>').appendTo('body');
        var $sdiv   = $('<div>').appendTo('body');
        var $iframe = $('<iframe id="test11" src="about:blank">"');
        var iframe  = $iframe[0];

        var checkIframeDocumentOverrided = function () {
            var document = iframe.contentDocument;
            var result   = true;

            if (document) {
                if (document.write.toString() === nativeMethods.documentWrite.toString())
                    result = false;
            }

            // NOTE: Stack overflow check.
            ok(!document || document.getElementsByTagName('body'));
            ok(window.top.document.getElementsByTagName('body'));

            ok(result);
        };

        var checkWriteFunction = function () {
            checkIframeDocumentOverrided();
            iframe.contentDocument.open();
            checkIframeDocumentOverrided();
            iframe.contentDocument.write('<div></div>');
            checkIframeDocumentOverrided();
            iframe.contentDocument.close();
            checkIframeDocumentOverrided();

            iframe.contentDocument.open();
            checkIframeDocumentOverrided();
            iframe.contentDocument.write('<html><body><a href="http://google.com/"></body></html>');
            checkIframeDocumentOverrided();
            iframe.contentDocument.close();
            checkIframeDocumentOverrided();
        };

        $iframe.ready(checkIframeDocumentOverrided);
        $iframe.load(checkIframeDocumentOverrided);

        // NOTE: After appended to DOM.
        $div[0].appendChild(iframe);
        checkWriteFunction();

        // NOTE: After reinserted to DOM.
        $sdiv[0].appendChild(iframe);
        checkWriteFunction();

        $iframe.remove();
        $sdiv.remove();
        $div.remove();
    });
}

module('resgression');

asyncTest('document.write for several tags in iframe (T215136)', function () {
    expect(2);

    var src    = window.QUnitGlobals.getResourceUrl('../../../data/node-sandbox/iframe-with-doc-write.html');
    var iframe = document.createElement('iframe');

    iframe.setAttribute('src', src);
    window.QUnitGlobals.waitForIframe(iframe)
        .then(function () {
            var div = iframe.contentDocument.querySelector('#parent');

            strictEqual(div.children.length, 3);
            strictEqual(div.parentNode.lastElementChild, div);

            iframe.parentNode.removeChild(iframe);
            start();
        });

    document.body.appendChild(iframe);
});

test('document.write for page html (T190753)', function () {
    var $div            = $('<div>').appendTo('body');
    var $iframe         = $('<iframe id="test5">');
    var script          = 'var a = [1,2], b = 0; window.test = a[b];';
    var processedScript = processScript(script, true, false).replace(/\s*/g, '');

    overrideDomMeth($div[0]);
    $div[0].appendChild($iframe[0]);

    ok(script.replace(/\s*/g, '') !== processedScript);

    $iframe[0].contentDocument.write('<html><head><script>' + script + '<\/script><head><body></body></html>');

    strictEqual($iframe[0].contentWindow.test, 1);

    var scripts = $iframe[0].contentDocument.getElementsByTagName('script');

    strictEqual(scripts.length, 1);
    strictEqual(scripts[0].text.replace(/\s*/g, ''), processedScript);

    $iframe.remove();
    $div.remove();
});

if (browserUtils.isFirefox || browserUtils.isIE11) {
    asyncTest('override window methods after document.write call (T239109)', function () {
        var $iframe = $('<iframe id="test_wrapper">');

        window.top.onIframeInited = function (window) {
            var iframeIframeSandbox = window['%hammerhead%'].sandbox.iframe;

            iframeIframeSandbox.on(iframeIframeSandbox.IFRAME_READY_TO_INIT_EVENT, initIframeTestHandler);
            iframeIframeSandbox.off(iframeIframeSandbox.IFRAME_READY_TO_INIT_EVENT, iframeIframeSandbox.iframeReadyToInitHandler);
        };

        $iframe[0].setAttribute('src', 'javascript:\'' +
                                       '   <html><body><script>' +
                                       '       window.top.onIframeInited(window);' +
                                       '       var quote = String.fromCharCode(34);' +
                                       '       if(true){document.write("<iframe id=" + quote + "test_iframe" + quote + "></iframe>");}' +
                                       '       if(true){document.getElementById("test_iframe").contentDocument.write("<body><script>document.body.innerHTML = " + quote + "<div></div>" + quote + ";</s" + "cript></body>");}' +
                                       '   </sc' + 'ript></body></html>' +
                                       '\'');

        $iframe.appendTo('body');

        var id = setInterval(function () {
            var testIframe = $iframe[0].contentDocument.getElementById('test_iframe');

            if (testIframe && testIframe.contentDocument.body.children[0].tagName.toLowerCase() === 'div') {
                clearInterval(id);
                ok(true);
                $iframe.remove();
                start();
            }
        }, 10);

    });
}

if (!browserUtils.isFirefox) {
    asyncTest('document.write([]) in iframe (T239131)', function () {
        var iframe  = document.createElement('iframe');

        iframe.id = 'test04';
        window.QUnitGlobals.waitForIframe(iframe)
            .then(function () {
                // NOTE: Some browsers remove their documentElement after a "write([])" call. Previously, if the
                // documentElement was null, "overrideDomMethods" failed with the 'Maximum call stack size exceeded' error.
                iframe.contentDocument.write([]);
                ok(true);
                iframe.contentDocument.close();
                iframe.parentNode.removeChild(iframe);
                start();
            });
        document.body.appendChild(iframe);
    });
}

test('document.write with __begin$, __end$ parameters (T232454)', function () {
    var result = '';

    /* eslint-disable no-unused-vars */
    var notADocument = {
        write: function () {
            result += Array.prototype.slice.call(arguments).join('');
        },

        writeln: function () {
            result += Array.prototype.slice.call(arguments).join('');
        }
    };
    /* eslint-enable no-unused-vars */

    var processedScript = processScript(
        'if (true) {' +
        '   notADocument.write("w1", "w2", "w3");' +
        '   notADocument.writeln("wl1", "wl2", "wl3");' +
        '   notADocument.writeln();' +
        '   notADocument.write();' +
        '}'
    );

    eval(processedScript);

    ok(processedScript.indexOf(INTERNAL_LITERAL.documentWriteBegin) !== -1 &&
       processedScript.indexOf(INTERNAL_LITERAL.documentWriteEnd) !== -1);

    strictEqual(result, 'w1w2w3wl1wl2wl3');
});

asyncTest('the onDocumentCleaned event is not raised after calling document.write (GH-253)', function () {
    expect(1);

    var iframe  = document.createElement('iframe');
    var src     = window.QUnitGlobals.getResourceUrl('../../../data/node-sandbox/iframe-without-document-cleaned-event.html');
    var handler = function (e) {
        window.removeEventListener('message', handler);
        strictEqual(e.data, 'success');
        iframe.parentNode.removeChild(iframe);
        start();
    };

    window.addEventListener('message', handler);
    iframe.setAttribute('src', src);
    document.body.appendChild(iframe);
});

asyncTest('document elements are overridden after document.write has been called (GH-253)', function () {
    var iframe = document.createElement('iframe');

    iframe.id  = 'test';
    iframe.src = window.QUnitGlobals.getResourceUrl('../../../data/node-sandbox/iframe-override-elems-after-write.html');

    var onMessageHandler = function (e) {
        window.removeEventListener('message', onMessageHandler);

        var data = e.data instanceof Object ? e.data : JSON.parse(e.data);

        strictEqual(data.length, 3);

        data.forEach(function (testResult) {
            ok(testResult.success, testResult.description);
        });

        iframe.parentNode.removeChild(iframe);

        start();
    };

    window.addEventListener('message', onMessageHandler);

    document.body.appendChild(iframe);
});
