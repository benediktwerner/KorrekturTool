import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MarkingSection from './MarkingSection';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            blatt: 1,
            minExercise: 0,
            maxExercise: 0,
            exercises: {},
            isMarking: false
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleChangeExerciseMaxPoints = this.handleChangeExerciseMaxPoints.bind(this);
    }

    handleChangeExerciseMaxPoints(event) {
        const key = event.target.dataset["exerciseId"];
        const value = event.target.value;
        this.setState(function (state, props) {
            var exercises = state.exercises;
            exercises[key] = {
                maxPoints: value
            };
            return {
                exercises: exercises
            };
        });
    }

    handleChange(event) {
        var createExercisesMin = -1, createExercisesMax = -1;
        if (event.target.id === "minExercise") {
            createExercisesMin = parseInt(event.target.value, 10);
            createExercisesMax = this.state.minExercise;
        }
        else if (event.target.id === "maxExercise") {
            createExercisesMin = this.state.maxExercise + 1;
            createExercisesMax = parseInt(event.target.value, 10) + 1;
        }
        if (createExercisesMax - createExercisesMin > 0) {
            this.setState(function (state, props) {
                var exercises = state.exercises;
                for (var i = createExercisesMin; i < createExercisesMax; i++) {
                    exercises[i] = {
                        maxPoints: ""
                    };
                }
                return { exercises: exercises };
            });
        }
        this.setState({
            [event.target.id]: parseInt(event.target.value, 10)
        });
    }

    renderExerciseConfig() {
        if (!this.state.minExercise || !this.state.maxExercise) {
            return "";
        }

        var exercises = [];
        for (var i = this.state.minExercise; i <= this.state.maxExercise; i++) {
            exercises.push(
                <div className="col form-group" key={"exercise-" + i}>
                    <label>{this.state.blatt}.{i}</label>
                    <input type="number" className="form-control" data-exercise-id={i} onChange={this.handleChangeExerciseMaxPoints} value={this.state.exercises[i].maxPoints}></input>
                </div>
            );
        }
        return exercises;
    }

    render() {
        var markingSection;
        if (this.state.isMarking)
            markingSection = <MarkingSection state={this.state} />;
        else markingSection = <button type="button" className="btn btn-primary" onClick={() => { this.setState({ isMarking: true }) }}>Bewerten</button>;

        return (
            <div className="container">
                <div className="form-row">
                    <div className="col form-group form-inline">
                        <label>Blatt:</label>
                        <input id="blatt" type="number" className="form-control" placeholder="Blatt" onChange={this.handleChange} value={this.state.blatt}></input>
                    </div>
                    <div className="col form-group form-inline">
                        <label>Erste Aufgaben:</label>
                        <input id="minExercise" type="number" className="form-control" placeholder="Erste Aufgabe" onChange={this.handleChange} value={this.state.minExercise}></input>
                    </div>
                    <div className="col form-group form-inline">
                        <label>Letzte Aufgaben:</label>
                        <input id="maxExercise" type="number" className="form-control" placeholder="Letzte Aufgabe" onChange={this.handleChange} value={this.state.maxExercise}></input>
                    </div>
                </div>
                <div className="form-row">
                    {this.renderExerciseConfig()}
                </div>
                <div className="marking-section">
                    {markingSection}
                </div>
            </div>
        );
    }
}

export default App;
