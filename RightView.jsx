import { ipcRenderer } from 'electron';
import React, { Component } from 'react';
import fs from 'fs-extra';
import highlighter from 'node-syntaxhighlighter';
import $ from 'jquery';

let isResizing = false;
let rightViewInstance = null;
const languageJava = highlighter.getLanguage("java");

class RightView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            width: 500,
            output: []
        }

        ipcRenderer.on('run', () => this.props.onRun(this.props.src));

        rightViewInstance = this;
        this.handleResize = this.handleResize.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.src !== nextProps.src && this.state.width === 0) {
            this.setState({
                width: 499
            });
            setTimeout(() => this.setState({ width: 500 }), 10);
        }
    }

    handleResize(e) {
        if (!isResizing)
            return;

        e.preventDefault();
        const newWidth = $(window).width() - e.clientX;
        this.setState({
            width: newWidth > 75 ? newWidth : 0
        });
    }

    componentDidMount() {
        $("#resize-handle").on("mousedown", () => isResizing = true);
        $(document)
            .on("mouseup", () => { isResizing = false })
            .on("mousemove", this.handleResize);
    }

    componentWillUnmount() {
        rightViewInstance = null;
    }

    addOutput(text, type) {
        if (type === "error")
            text = "!" + type + "!" + text;
        this.setState((state, props) => {
            state.output.push(text);
            return {
                output: state.output
            }
        });
    }

    renderOutput() {
        const output = [];
        for (let i in this.state.output) {
            const line = this.state.output[i];
            if (line.startsWith("!error!"))
                output.push(<span className="error" key={i}>{line.replace("!error!", "")}</span>)
            else
                output.push(<span key={i}>{line}</span>);
        }
        return output;
    }

    renderContent() {
        if (!this.props.src)
            return "";
        else if (this.props.src.endsWith(".pdf"))
            return <webview className="full-height" src={this.props.src} plugins="true"></webview>;

        const content = fs.readFileSync(this.props.src, "utf8");
        return <div id="code-view" dangerouslySetInnerHTML={{ __html: highlighter.highlight(content, languageJava) }}></div>;
    }

    render() {
        let style = { width: this.state.width + "px" };
        if (this.state.width === 0 || !this.props.src)
            style.display = "none";
        return (
            <div>
                <div className="right-view" style={style}>
                    <div id="resize-handle"></div>
                    {this.renderContent()}
                    <pre id="console-output">
                        {this.renderOutput()}
                    </pre>
                    <div id="control-bar">
                        <button title="Close" onClick={() => this.setState({ width: 0 })}><i className="fa fa-times"></i></button>
                        <div className="divider" hidden={!this.props.showRunButton}></div>
                        <button title="Run" onClick={() => this.props.onRun(this.props.src)} hidden={!this.props.showRunButton}><i className="fa fa-play"></i> Run</button>
                        <div className="divider" hidden={this.state.output.length === 0}></div>
                        <button title="Clear" onClick={() => this.setState({ output: [] })} hidden={this.state.output.length === 0}><i className="fa fa-ban"></i> Clear</button>
                    </div>
                </div>
                <div style={style}></div>
            </div>
        );
    }
}

function addOutput(text, error) {
    if (rightViewInstance) {
        rightViewInstance.addOutput(text, error);
    }
}

function clearOutput() {
    if (rightViewInstance) {
        rightViewInstance.setState({
            output: []
        });
    }
}

export { addOutput, clearOutput };
export default RightView;
