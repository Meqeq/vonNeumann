'use_strict';
import React, { Component } from 'react';

import '../css/meqeqEditor.css';

export default class Editor extends Component {
    constructor(props) {
        super(props);

        this.state = { code: "", coloured: "" }
        this.editor = React.createRef();
    }
/*
    onChange(event) {
        this.setState({ code: this.colourText(text)});
        //this.editor.selectionStart = this.editor.selectionEnd = start + 1;
        console.log(event.target);
    }

    colourText(text) {
        //let keywords = [ '.UNIT', '.DATA', '.CODE', '.WORD', '@A', '@B' ];
        //let commands = [ 'load', 'store', 'jump', 'add' ];
/*
        keywords.forEach( value => {
            let filter = new RegExp(value, "g");
            
            let matches = text.match(filter);
            console.log(matches);
            if(matches) {
                matches.forEach( match => {
                    text = text.replace(match, "<span color='red'>" + match + "</span>");
                });
            }
        });

        text = text.replace(/.UNIT|.DATA|.WORD|.CODE|@A|@B|.END/g, "<span style='color: blue'>.UNIT</span>");
        console.log(text);
        return text;
    }
    */

    onChange(event) {
        //console.log(event.target);

        let text = this.state.code.replace(/.UNIT|.DATA|.WORD|.CODE|@A|@B|.END/g, "<span style='color: blue'>.UNIT</span>");
        text = text.replace(/\n/g, "<br />");
        let pos = window.getSelection();

        let startNode = pos.getRangeAt(0).startContainer;
        let startPos = pos.getRangeAt(0).startOffset;
        let endNode = pos.anchorNode;
        let endPos = pos.getRangeAt(0).endOffset;

        let rng = pos.getRangeAt(0).cloneRange();
        console.log(pos.getRangeAt(0));
        console.log("--------------");
        this.setState({ coloured: text }, () => {
            this.editor.current.innerHTML = text;

            let kek = window.getSelection();
            kek.removeAllRanges();
            kek.addRange(rng);
            //event.target.focus();
            console.log("--------------");
            console.log(window.getSelection().getRangeAt(0));
        });
    }

    render() {
        return(
            <div className="meqeq-editor">
                <div className="line-numbers">
                    <div>
                        1
                    </div>

                    <div>
                        2
                    </div>
                </div>

                <p 
                    className="editor-code" 
                    contentEditable 
                    onKeyUp={ event => this.onChange(event) }     
                    onInput={ event => this.setState({ code: event.target.innerText, coloured: "" }) }   
                    ref={ this.editor } 
                > 
                </p>
            </div>  
        );
    }
}