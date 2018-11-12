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
                completeSingle: false
            })
            console.log(cm.cursorCoords())
            var state = cm.getTokenAt(cm.getCursor()).state;
            var inner = CodeMirror.innerMode(cm.getMode(), state);
            console.log("state", state)
            console.log("inner", inner)
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
        
        //helper node adding    /*change 3*/
        if(cm.state.helper) remove(cm.state.helper);/*change 3*/
        
        var helperContent = elt("span", null, elt("strong", null, "fn(parameter? parameterType) -> returnType"));
        helperContent.appendChild(document.createTextNode(" - " + "This is the function description"));
        helperContent.appendChild(document.createTextNode(" "));
        helperContent.appendChild(elt("a", null, "[link]"));
        
        var where = cm.cursorCoords();/*change 3*/
        var helper = cm.state.helper = makeTooltip(where.right + 1, where.bottom, helperContent);
    });

      function remove(node) {/*change 3*/
          var p = node && node.parentNode;
          if (p) p.removeChild(node);
      }

    function makeTooltip(x, y, content) {/*change 3*/
        var node = elt("div", "helper", content);
        node.style.left = x + "px";
        node.style.top = y + "px";
        document.body.appendChild(node);
        return node;
    }
        
    function elt(tagname, cls /*, ... elts*/ ) {/*change 3*/
        var e = document.createElement(tagname);
        if (cls) e.className = cls;
        for (var i = 2; i < arguments.length; ++i) {
            var elt = arguments[i];
            if (typeof elt == "string") elt = document.createTextNode(elt);
            e.appendChild(elt);
        }
        return e;
    }

})
