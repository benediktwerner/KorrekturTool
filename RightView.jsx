import React, { Component } from 'react';
import fs from 'fs-extra';
import highlighter from 'node-syntaxhighlighter';
import $ from 'jquery';

let isResizing = false;
const languageJava = highlighter.getLanguage("java");

class RightView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            width: 500
        }

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

    renderContent() {
        if (!this.props.src)
            return "";
        else if (this.props.src.endsWith(".pdf"))
            return <webview className="full-height" src={this.props.src} plugins="true"></webview>;

        const content = fs.readFileSync(this.props.src, "utf8");
        return <div className="full-height" dangerouslySetInnerHTML={{ __html: highlighter.highlight(content, languageJava, { "class-name": "full-height" }) }}></div>;
    }

    render() {
        var style = { maxWidth: this.state.width + "px" };
        if (this.state.width === 0 || !this.props.src)
            style.display = "none";
        return (
            <div className="col right-view" style={style}>
                <div id="resize-handle"></div>
                <div className="full-height">
                    {this.renderContent()}
                </div>
                <button id="close-view" title="Close" onClick={() => this.setState({ width: 0 })}><i className="fa fa-times"></i></button>
            </div>
        );
    }
}

export default RightView;
