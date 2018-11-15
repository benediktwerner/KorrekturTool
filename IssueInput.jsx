import React, { Component } from 'react';

class IssueInput extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isEditing: false,
      checked: false,
      text: props.text,
      points: props.points,
    };

    $('body').click(event => {
      if (this.state.isEditing && !$(event.target).closest('.issue-input').length) this.setState({ isEditing: false });
    });

    if (this.props.resetListeners !== undefined) {
      this.props.resetListeners.push(() => this.setState({ checked: false }));
    }

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentWillReceiveProps(props) {
    this.setState((state, props) => {
      return {
        text: props.text,
        points: props.points,
        checked: props.checked === undefined ? state.checked : props.checked,
      };
    });
  }

  handleChange(event) {
    if (this.props.onChange) this.props.onChange(event.target.dataset.for, event.target.value);
    this.setState({
      [event.target.dataset.for]: event.target.value,
    });
  }

  handleClick(event) {
    event.preventDefault();
    this.setState((state, props) => {
      if (this.props.onChange) this.props.onChange('checked', !state.checked);
      return {
        checked: !state.checked,
      };
    });
  }

  render() {
    let checkbox,
      classes = 'list-group-item list-group-item-action issue-input';
    if (this.state.checked) {
      checkbox = <i className="fa fa-check-square-o" />;
      classes += ' list-group-item-primary';
    } else {
      checkbox = <i className="fa fa-square-o" />;
    }

    if (this.state.isEditing) {
      return (
        <a
          href="#"
          className={classes + ' editable'}
          id={`issue-${this.props.exercise}-${this.props.id}`}
          onClick={e => e.preventDefault()}
          data-checked={this.state.checked}
        >
          <div className="form-row">
            <div className="col-1 delete-issue" onClick={this.props.onDelete}>
              <i className="fa fa-minus" />
            </div>
            <div className="col">
              <input
                className="form-control"
                data-for="text"
                type="text"
                onChange={this.handleChange}
                value={this.state.text}
              />
            </div>
            <div className="col-2">
              <input
                className="form-control"
                data-for="points"
                type="number"
                onChange={this.handleChange}
                value={this.state.points}
              />
            </div>
          </div>
        </a>
      );
    } else {
      return (
        <a
          href="#"
          id={`issue-${this.props.exercise}-${this.props.id}`}
          data-checked={this.state.checked}
          className={classes}
          onClick={this.handleClick}
          onDoubleClick={() => this.setState({ isEditing: true })}
        >
          <div className="form-row">
            <div className="col-1">{checkbox}</div>
            <div className="col">{this.state.text}</div>
            <div className="col-2">{this.state.points}</div>
          </div>
        </a>
      );
    }
  }
}

export default IssueInput;
