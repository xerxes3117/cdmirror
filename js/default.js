$(document).ready(function () {

    var code = $(".codemirror-textarea")[0];

    var myDimensions = "variable1 variable2 variable3 variable4",
        myFunctions = "max min count sum count_distinct avg",
        myKeywords = "if else elseif then",
        /*change1*/
        myOperators = "and or not"; /*change1*/


    CodeMirror.defineMode("dimensions", function (config, parserConfig) {
        var functions = parserConfig.functions || {},
            /*change1*/
            dimensions = parserConfig.dimensions || {},
            keywords = parserConfig.keywords || {},
            /*change1*/
            operators = parserConfig.operators || {} /*change1*/

        var dimensionOverlay = {
            token: function (stream, state) {
                stream.eatWhile(/^[_\w\d]/);
                var word = stream.current().toLowerCase();

                if (functions.hasOwnProperty(word) && stream.peek() == "(") {
                    return "function"
                };
                if (keywords.hasOwnProperty(word)) return "keyword"; /*change1*/
                if (operators.hasOwnProperty(word)) return "operator"; /*change1*/
                if (dimensions.hasOwnProperty(word)) return "dimension";
                stream.next();
                return null;
            }
        };
        return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "text/x-sql"), dimensionOverlay);
    });



    CodeMirror.defineMIME("text/dimensions", {
        name: "dimensions",
        functions: set(myFunctions),
        /*change1*/
        keywords: set(myKeywords),
        /*change1*/
        dimensions: set(myDimensions),
        operators: set(myOperators) /*change1*/
    });

    function set(str) {
        var obj = {},
            words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    var editor = CodeMirror.fromTextArea(code, {
        lineNumbers: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete"
        },
        mode: "text/dimensions",
        autoCloseBrackets: true,
        matchBrackets: {
            afterCursor: true,
        },

    })

    editor.on("keyup", function (cm, event) {
        if (!cm.state.completionActive && event.keyCode != 13 && event.keyCode != 32) {
            cm.showHint({
                completeSingle: false,
                hint: getHints
            })
        }
    });

    editor.on("change", function (cm, event) {

        if (event.origin == "complete" && set(myFunctions).hasOwnProperty(event.text[0].replace(/\(\)/g, "").toLowerCase())) {
            var pos = editor.getCursor();
            pos.ch -= 1;
            editor.setCursor(pos)
        } else if (event.origin == "complete" && set(myDimensions).hasOwnProperty(event.text[0].toLowerCase())) {
            editor.replaceSelection(" ")
            editor.setCursor(editor.getCursor().line, editor.getCursor().ch)
        }

        console.log("number of lines", cm.lineCount())
        console.log("line1", cm.getLineTokens(0));
        console.log("line2", cm.getLineTokens(1));
    })

    editor.on('cursorActivity', function (cm, event) {

        //Helper function logic
        var pos = editor.getCursor();
        var charAfterCursor = editor.getRange({
            line: pos.line,
            ch: pos.ch
        }, {
            line: pos.line,
            ch: pos.ch + 1
        });

        if (/[a-z]/.test(charAfterCursor.toLowerCase())) {
            var word = editor.findWordAt(editor.getCursor());
            console.log("word inside cursoractivity: on text", editor.getRange(word.anchor, word.head))
        } else if (charAfterCursor == "(") {
            var word = editor.findWordAt({
                line: editor.getCursor().line,
                ch: editor.getCursor().ch - 1
            });
            console.log("word inside cursoractivity: on opening bracket", editor.getRange(word.anchor, word.head))
        } else if (charAfterCursor == ")") {

            var matchingBracketPos = cm.findMatchingBracket({
                line: editor.getCursor().line,
                ch: editor.getCursor().ch + 1
            });

            var word = editor.findWordAt({
                line: matchingBracketPos.to.line,
                ch: matchingBracketPos.to.ch - 1
            });
            console.log("word inside cursoractivity: on closing bracket", editor.getRange(word.anchor, word.head))
        }

        showHelperInfo(cm);

    });

    function showHelperInfo(cm) {
        //helper node adding   
        if (cm.state.helper) remove(cm.state.helper);

        var helperContent = elt("span", null, elt("strong", null, "fn(parameter? parameterType) -> returnType"));
        helperContent.appendChild(document.createTextNode(" - " + "This is the function description"));
        helperContent.appendChild(document.createTextNode(" "));
        helperContent.appendChild(elt("a", null, "[link]"));

        var where = cm.cursorCoords();
        var helper = cm.state.helper = makeTooltip(where.right + 1, where.bottom, helperContent);
    }

    function remove(node) { 
        var p = node && node.parentNode;
        if (p) p.removeChild(node);
    }

    function makeTooltip(x, y, content) { 
        var node = elt("div", "helper", content);
        node.style.left = x + "px";
        node.style.top = y + "px";
        document.body.appendChild(node);
        return node;
    }

    function elt(tagname, cls /*, ... elts*/ ) { 
        var e = document.createElement(tagname);
        if (cls) e.className = cls;
        for (var i = 2; i < arguments.length; ++i) {
            var elt = arguments[i];
            if (typeof elt == "string") elt = document.createTextNode(elt);
            e.appendChild(elt);
        }
        return e;
    }


    function getHints() {

        var functions;
        var keywords;
        var dimensions;
        var Pos = CodeMirror.Pos;

        keywords = getKeywords(editor);
        dimensions = getDimensions(editor); 
        functions = getFunctions(editor); 

        var cur = editor.getCursor();
        var result = [];
        var token = editor.getTokenAt(cur),
            start, end, search;
        if (token.end > cur.ch) {
            token.end = cur.ch;
            token.string = token.string.slice(0, cur.ch - token.start);
        }

        if (token.string.match(/^[.`"\w@]\w*$/)) {
            search = token.string;
            start = token.start;
            end = token.end;
        } else {
            start = end = cur.ch;
            search = "";
        }

        addMatches(result, search, keywords, function (w) {
            return {
                text: w,
                className: "CodeMirror-hint-keywords"
            };
        });

        addMatches(result, search, functions, function (w) {
            return {
                text: w.toUpperCase() + "()",
                className: "CodeMirror-hint-functions"
            };
        });

        addMatches(result, search, dimensions, function (w) {
            return {
                text: w.toUpperCase(),
                className: "CodeMirror-hint-dimensions"
            };
        });

        var obj = {
            list: result,
            from: Pos(cur.line, start),
            to: Pos(cur.line, end)
        };

        var tooltip = null;
        CodeMirror.on(obj, "close", function () {
            remove(tooltip);
        });
        CodeMirror.on(obj, "update", function () {
            remove(tooltip);
        });
        CodeMirror.on(obj, "select", function (cur, node) {
            console.log("item selected");
            remove(tooltip);
            tooltip = makeTooltip(node.parentNode.getBoundingClientRect().right + window.pageXOffset,
                node.getBoundingClientRect().top + window.pageYOffset, "here's a side description for each list item");
            tooltip.className += " " + "hint-doc";
        });

        return obj;
    }

    function isArray(val) {
        return Object.prototype.toString.call(val) == "[object Array]"
    }

    function getKeywords(editor) {
        var mode = editor.doc.modeOption;
        if (mode === "sql" || mode === "text/dimensions") mode = "text/dimensions"; 
        return CodeMirror.resolveMode(mode).keywords; 
    }

    function getDimensions(editor) { /*change*/
        var mode = editor.doc.modeOption;
        if (mode === "sql" || mode === "text/dimensions") mode = "text/dimensions";
        return CodeMirror.resolveMode(mode).dimensions;
    }

    function getFunctions(editor) { /*change1*/
        var mode = editor.doc.modeOption;
        if (mode === "sql" || mode === "text/dimensions") mode = "text/dimensions"; 
        return CodeMirror.resolveMode(mode).functions; 
    }

    function getText(item) {
        return typeof item == "string" ? item : item.text;
    }

    function match(string, word) {
        var len = string.length;
        var sub = getText(word).substr(0, len);
        return string.toUpperCase() === sub.toUpperCase();
    }

    function addMatches(result, search, wordlist, formatter) { 
        if (isArray(wordlist)) {
            for (var i = 0; i < wordlist.length; i++)
                if (match(search, wordlist[i])) result.push(formatter(wordlist[i]))
        } else {
            for (var word in wordlist)
                if (wordlist.hasOwnProperty(word)) {
                    var val = wordlist[word]
                    if (!val || val === true)
                        val = word
                    else
                        val = val.displayText ? {
                            text: val.text,
                            displayText: val.displayText
                        } : val.text
                    if (match(search, val)) result.push(formatter(val))
                }
        }
    }

})
