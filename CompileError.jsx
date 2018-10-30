import React, { Component } from 'react';
import $ from 'jquery';

class CompileError extends Component {
    constructor(props) {
        super(props);
        this.rootElement = React.createRef();
    }

    componentDidMount() {
        $(this.rootElement.current).popover();
    }

    render() {
        return (
            <a tabIndex="0" className="compile-error" ref={this.rootElement}
                data-toggle="popover" data-placement="bottom"
                data-template='<div class="popover" role="tooltip"><div class="arrow"></div><pre class="popover-body"></pre></div>'
                data-trigger="focus" data-content={this.props.errorMessage}>
                <i className="fa fa-times-circle fa-padding"></i>
                Kompiliert nicht
            </a>
        );
    }
}

export default CompileError;
