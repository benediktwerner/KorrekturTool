import React, { Component } from 'react';


class IssueInput extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            isEditing: false
        };
    }

    render() {
        let section, checkbox;
        if (this.state.isEditing) {
            section = <div>
                <input className="form-control" type="text" defaultValue={this.props.text}></input>
                <input className="form-control" type="number" defaultValue={this.props.points}></input>
                <button type="button" className="btn" onClick={() => this.setState({isEditing: false})}><i className="fa fa-check"></i></button>
            </div>;
        }
        else {
            section = <div>
                {this.props.text}
                {this.props.points}
                <button type="button" className="btn" onClick={() => this.setState({isEditing: true})}><i className="fa fa-edit"></i></button>
            </div>;
        }

        if (this.props.value) {
            checkbox = <i className="fa fa-square-o"></i>;
        }
        else {
            checkbox = <i className="fa fa-check-square-o"></i>;
        }

        return <div onClick={this.props.onClick}>
            {checkbox}
            {section}
        </div>;
    }
}

export default IssueInput;
