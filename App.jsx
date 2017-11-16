import { ipcRenderer, remote } from 'electron';
import React, { Component } from 'react';
import fs from 'fs-extra';
import MarkingSection from './MarkingSection';
import RightView from './RightView';

const dialog = remote.dialog;

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            blatt: 1,
            minExercise: 0,
            maxExercise: 0,
            exercises: {},
            isMarking: false,
            rightViewUrl: "",
            dataDir: "data",
            compileDependencies: []
        }

        this.addSaveLoadListeners();
        this.handleChange = this.handleChange.bind(this);
        this.handleShowFile = this.handleShowFile.bind(this);
        this.handleChangeMinMaxExercise = this.handleChangeMinMaxExercise.bind(this);
        this.handleChangeExerciseMaxPoints = this.handleChangeExerciseMaxPoints.bind(this);
        this.handleIssueAdd = this.handleIssueAdd.bind(this);
        this.handleIssueDelete = this.handleIssueDelete.bind(this);
        this.handleIssueChange = this.handleIssueChange.bind(this);
    }

    handleChangeExerciseMaxPoints(event) {
        const key = event.target.dataset["exerciseId"];
        let value = parseFloat(event.target.value, 10);
        if (value < 0) value = 0;
        this.setState(function (state, props) {
            let exercises = state.exercises;
            exercises[key].maxPoints = value;
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
            const defaultExercise = { maxPoints: 0, issues: [] };
            if (newMinExercise === null) newMinExercise = state.minExercise;
            if (newMaxExercise === null) newMaxExercise = state.maxExercise;
            for (let i = newMinExercise; i <= newMaxExercise; i++) {
                exercises[i] = {
                    maxPoints: (state.exercises[i] || defaultExercise).maxPoints,
                    issues: (state.exercises[i] || defaultExercise).issues
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

    handleIssueAdd(exercise, text, points) {
        if (!text)
            return false;
        this.setState((state, props) => {
            const exercises = state.exercises;
            exercises[exercise].issues.push({
                text: text,
                points: parseFloat(points, 10)
            })
            return {
                exercises: exercises
            }
        });
        return true;
    }

    handleIssueDelete(exercise, index) {
        this.setState((state, props) => {
            const exercises = state.exercises;
            exercises[exercise].issues.splice(index, index + 1);
            return {
                exercises: exercises
            }
        });
    }

    handleIssueChange(exercise, index, key, value) {
        this.setState((state, props) => {
            const exercises = state.exercises;
            exercises[exercise].issues[index][key] = key === "points" ? parseFloat(value, 10) : value;
            return {
                exercises: exercises
            }
        });
    }

    render() {
        let markingSection;
        if (this.state.isMarking)
            markingSection = <MarkingSection
                state={this.state}
                onShowFile={this.handleShowFile}
                onIssueChange={this.handleIssueChange}
                onIssueAdd={this.handleIssueAdd}
                onIssueDelete={this.handleIssueDelete}
                setRunListener={(run) => this.onRun = run}
            />;
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
                    <RightView src={this.state.rightViewUrl} onRun={this.onRun} showRunButton={this.state.rightViewUrl.endsWith(".java")} />
                </div>
            </div>
        );
    }

    addSaveLoadListeners() {
        const options = {
            filters: [
                { name: "Json", extensions: ["json"] },
                { name: "All Files", extensions: ["*"] }
            ],
            properties: ["openFile"]
        };
        ipcRenderer.on('save', (event, arg) => {
            dialog.showSaveDialog(options, (fileName) => {
                if (fileName === undefined)
                    return;

                fs.writeJson(fileName, this.state, err => {
                    if (err) console.error(err)
                });
            });
        });
        ipcRenderer.on('load', (event, arg) => {
            dialog.showOpenDialog(options, (fileNames) => {
                if (!fileNames)
                    return;

                fs.readJson(fileNames[0], (err, state) => {
                    if (err) console.error(err);
                    this.setState(state);
                });
            });
        });

        ipcRenderer.on('open-data', (event, arg) => {
            dialog.showOpenDialog({ properties: ["openDirectory"] }, (fileNames) => {
                if (!fileNames)
                    return;

                this.setState({
                    dataDir: fileNames[0]
                });
            });
        });

        ipcRenderer.on('open-compile-deps', (event, arg) => {
            dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] }, (fileNames) => {
                if (!fileNames)
                    return;

                this.setState({
                    compileDependencies: fileNames
                });
            });
        });
    }
}

export default App;
