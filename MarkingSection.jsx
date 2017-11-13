import React, { Component } from 'react';
import fs from 'fs-extra';
import $, { trim } from 'jquery';
import jschardet from 'jschardet';
import { exec } from 'child_process';
import os from 'os';

class MarkingSection extends Component {
    constructor(props) {
        super(props);

        var dataFiles = fs.readdirSync("data");
        this.state = {
            students: createStudentsList(dataFiles),
            index: 0,
            files: [],
            compileStatus: {},
            encodings: {},
            binDir: fs.mkdtempSync(os.tmpdir() + "/korrekturToolTmp") + "/",
            points: {}
        }

        this.handleChange = this.handleChange.bind(this);
        this.handlePrevNext = this.handlePrevNext.bind(this);
        this.handleShowOutput = this.handleShowOutput.bind(this);
    }

    componentDidMount() {
        this.studentChanged();
    }

    studentChanged() {
        this.setState((state, props) => {
            const files = fs.readdirSync(state.students[state.index].dirPath);
            const basePath = state.students[state.index].dirPath + "/";
            var encodings = {}, compileStatus = {};
            for (var i in files) {
                encodings[files[i]] = getFileEncoding(basePath + files[i]);
                if (files[i].endsWith(".java")) {
                    compileStatus[files[i]] = undefined;
                    this.checkCompileStatus(files[i], basePath);
                }
                else {
                    compileStatus[files[i]] = null;
                }
            }
            return {
                encodings: encodings,
                compileStatus: compileStatus,
                files: files,
                points: {}
            };
        });
    }

    checkCompileStatus(fileName, basePath) {
        const compilePath = this.state.binDir + fileName;
        fs.copy(basePath + fileName, compilePath)
            .then(() => {
                exec('javac -encoding utf-8 "' + compilePath + '"', (err, stdout, stderr) => {
                    this.setState((state, props) => {
                        var compileStatus = state.compileStatus;
                        compileStatus[fileName] = err ? "error" : "success";
                        return {
                            compileStatus: compileStatus
                        };
                    });
                });
            })
            .catch(err => console.error(err));
    }

    handlePrevNext(event) {
        if (event.target.className.indexOf("btn-prev") >= 0) {
            this.setState((state, props) => { return { index: state.index - 1 }; })
            this.studentChanged();
        }
        else if (event.target.className.indexOf("btn-next") >= 0) {
            this.setState((state, props) => { return { index: state.index + 1 }; })
            this.studentChanged();
        }
    }

    handleChange(event) {
        const exercise = event.target.dataset.exercise;
        const newValue = parseInt(event.target.value, 10);
        this.setState((state, props) => {
            const points = state.points;
            points[exercise] = newValue;
            return { points: points };
        });
    }

    renderFiles() {
        const basePath = this.state.students[this.state.index].dirPath + "/";
        const files = this.state.files;
        var fileElements = [];
        for (var i in files) {
            fileElements.push(<div className="row" key={"file-" + i}>
                <div className="col">
                    {getFileIcon(files[i])}
                    <a className="file-link" onClick={this.props.onShowFile} data-file={basePath + files[i]}>
                        {files[i]}
                    </a>
                </div>
                <div className="col">{getCompileInfo(this.state.compileStatus[files[i]])}</div>
                <div className="col">{getEncodingInfo(this.state.encodings[files[i]])}</div>
            </div>);
        }
        return fileElements;
    }

    renderExercises() {
        if (this.props.state.minExercise <= 0 || this.props.state.maxExercise <= 0)
            return "";

        var exercises = [];
        for (var i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
            exercises.push(<div key={"exercise-" + i}>
                <h4 className="heading-margin">Aufgabe {this.props.state.blatt}.{i}</h4>
                <div className="row">
                    <div className="col-1 form-inline points">
                        <input type="number" className="form-control form-control-sm" data-exercise={i} onChange={this.handleChange} value={this.state.points[i] || ""}></input> / {this.props.state.exercises[i].maxPoints || "?"}
                    </div>
                    <div className="col">
                        <textarea id={"exercise-" + i + "-text"} className="form-control"></textarea>
                    </div>
                </div>
            </div>);
        }
        return exercises;
    }

    handleShowOutput(event) {
        let output = "Gesamt: " + this.getTotalPoints() + " / " + this.getMaxPoints() + "\n\n";
        for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
            output += "Aufgabe " + this.props.state.blatt + "." + i;
            output += " (" + this.state.points[i] + " / " + this.props.state.exercises[i].maxPoints + ")\n";
            output += $("#exercise-" + i + "-text").val() + "\n\n";
        }

        $("#modal .modal-title").text("Output");
        $("#modal .modal-body").append('<textarea class="form-control output">' + output + "</textarea>");
        $("textarea.output").css("height", Math.max($(window).height() - 275, 300) + "px");
    }

    render() {
        return (
            <div className="marking-section">
                <hr />
                <div className="row">
                    <div className="col">
                        <h3>{this.state.students[this.state.index].number}</h3>
                        <button className="btn btn-primary" data-toggle="modal" data-target="#modal" onClick={this.handleShowOutput}>HTML</button>
                    </div>
                    <div className="col align-right valign-content-middle">
                        <span className="indexer">{this.state.index + 1} / {this.state.students.length}</span>
                        <button type="button" className="btn btn-outline-primary btn-prev" onClick={this.handlePrevNext} disabled={this.state.index <= 0}>
                            <i className="fa fa-arrow-left fa-lg"></i>Prev
                        </button>
                        <button type="button" className="btn btn-outline-primary btn-next" onClick={this.handlePrevNext} disabled={this.state.index >= this.state.students.length - 1}>
                            Next<i className="fa fa-arrow-right fa-lg"></i>
                        </button>
                    </div>
                </div>
                <h3 className="heading-margin">Dateien</h3>
                {this.renderFiles()}
                <hr />
                <h3 className="heading-margin">Aufgaben ({this.getTotalPoints() || "0"} / {this.getMaxPoints() || "?"})</h3>
                {this.renderExercises()}
            </div>
        );
    }

    getTotalPoints() {
        var points = 0;
        for (var i in this.state.points) {
            points += this.state.points[i];
        }
        return points;
    }

    getMaxPoints() {
        var maxPoints = 0;
        for (var i in this.props.state.exercises) {
            maxPoints += this.props.state.exercises[i].maxPoints;
        }
        return maxPoints;
    }
}

function createStudentsList(files) {
    var splitName, students = [];
    for (var i in files) {
        if (!fs.statSync("data/" + files[i]).isDirectory())
            continue;
        splitName = files[i].split("-");
        students.push({
            dirName: files[i],
            dirPath: "data/" + files[i],
            number: trim(splitName[splitName.length > 1 ? 1 : 0])
        });
    }
    return students;
}

function getFileIcon(fileName) {
    if (fileName.endsWith(".pdf")) {
        return <i className="fa fa-file-pdf-o fa-padding"></i>
    }
    else if (fileName.endsWith(".java")) {
        return <i className="icon-java-bold fa-lg"></i>
    }
    else if (fileName.endsWith(".txt")) {
        return <i className="fa fa-file-text-o fa-padding"></i>
    }
    return <i className="fa fa-file-o fa-padding"></i>
}

function getCompileInfo(compileStatus) {
    if (compileStatus === undefined) {
        return <span><i className="fa fa-spinner fa-pulse fa-fw"></i>Kompiliere</span>;
    }
    else if (compileStatus === null) {
        return "";
    }
    else if (compileStatus === "success") {
        return <span><i className="fa fa-check-circle fa-padding"></i>Kompiliert</span>;
    }
    return <span><i className="fa fa-times-circle fa-padding"></i>Kompiliert nicht</span>;
}

function getEncodingInfo(encoding) {
    if (!encoding) {
        return <span><i className="fa fa-question-circle fa-padding"></i>Unbekannt</span>;
    }
    if (encoding === "ASCII" || encoding === "UTF-8") {
        return <span><i className="fa fa-check-circle fa-padding"></i>{encoding}</span>;
    }
    return <span><i className="fa fa-times-circle fa-padding"></i>{encoding}</span>;
}

function getFileEncoding(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return (jschardet.detect(fileBuffer).encoding || "").toUpperCase();
}

export default MarkingSection;
