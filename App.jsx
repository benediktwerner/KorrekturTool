import React, { Component } from 'react';
import MarkingSection from './MarkingSection';
import RightView from './RightView';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            blatt: 1,
            minExercise: 0,
            maxExercise: 0,
            exercises: {},
            isMarking: false,
            rightViewUrl: ""
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleShowFile = this.handleShowFile.bind(this);
        this.handleChangeMinMaxExercise = this.handleChangeMinMaxExercise.bind(this);
        this.handleChangeExerciseMaxPoints = this.handleChangeExerciseMaxPoints.bind(this);
    }

    handleChangeExerciseMaxPoints(event) {
        const key = event.target.dataset["exerciseId"];
        let value = parseFloat(event.target.value, 10);
        if (value < 0) value = 0;
        this.setState(function (state, props) {
            let exercises = state.exercises;
            exercises[key] = {
                maxPoints: value
            };
            return {
                exercises: exercises
            };
        });
    }

    handleChangeMinMaxExercise(event) {
        let newMinExercise = null, newMaxExercise = null;
        if (event.target.id === "minExercise") {
            newMinExercise = parseFloat(event.target.value, 10);
            if (newMinExercise < 0) newMinExercise = 0;
        }
        else if (event.target.id === "maxExercise") {
            newMaxExercise = parseFloat(event.target.value, 10);
            if (newMaxExercise < 0) newMaxExercise = 0;
        }
        this.setState(function (state, props) {
            let exercises = {};
            const defaultExercise = { maxPoints: 0 };
            if (newMinExercise === null) newMinExercise = state.minExercise;
            if (newMaxExercise === null) newMaxExercise = state.maxExercise;
            for (let i = newMinExercise; i <= newMaxExercise; i++) {
                exercises[i] = {
                    maxPoints: (state.exercises[i] || defaultExercise).maxPoints
                };
            }
            return {
                exercises: exercises,
                minExercise: newMinExercise,
                maxExercise: newMaxExercise
            };
        });
    }

    handleChange(event) {
        this.setState({
            [event.target.id]: parseInt(event.target.value, 10)
        });
    }

    renderExerciseConfig() {
        if (this.state.minExercise <= 0 || this.state.maxExercise <= 0) {
            return "";
        }

        let exercises = [];
        for (let i = this.state.minExercise; i <= this.state.maxExercise; i++) {
            exercises.push(
                <div className="col form-group" key={"exercise-" + i}>
                    <label>{this.state.blatt}.{i}</label>
                    <input type="number" className="form-control" data-exercise-id={i} onChange={this.handleChangeExerciseMaxPoints} value={this.state.exercises[i].maxPoints}></input>
                </div>
            );
        }
        return exercises;
    }

    handleShowFile(event) {
        this.setState({
            rightViewUrl: event.target.dataset["file"]
        });
    }

    render() {
        let markingSection;
        if (this.state.isMarking)
            markingSection = <MarkingSection state={this.state} onShowFile={this.handleShowFile} />;
        else markingSection = <button type="button" className="btn btn-primary" onClick={() => { this.setState({ isMarking: true }) }}>Bewerten</button>;

        return (
            <div className="container-fluid full-height">
                <div className="row full-height">
                    <div className="col main-view">
                        <div className="form-row">
                            <div className="col form-group">
                                <label>Blatt:</label>
                                <input id="blatt" type="number" className="form-control" placeholder="Blatt" onChange={this.handleChange} value={this.state.blatt}></input>
                            </div>
                            <div className="col form-group">
                                <label>Erste Aufgaben:</label>
                                <input id="minExercise" type="number" className="form-control" placeholder="Erste Aufgabe" onChange={this.handleChangeMinMaxExercise} value={this.state.minExercise}></input>
                            </div>
                            <div className="col form-group">
                                <label>Letzte Aufgaben:</label>
                                <input id="maxExercise" type="number" className="form-control" placeholder="Letzte Aufgabe" onChange={this.handleChangeMinMaxExercise} value={this.state.maxExercise}></input>
                            </div>
                        </div>
                        <div className="form-row">
                            {this.renderExerciseConfig()}
                        </div>
                        {markingSection}
                    </div>
                    <RightView src={this.state.rightViewUrl} />
                </div>
            </div>
        );
    }
}

export default App;
