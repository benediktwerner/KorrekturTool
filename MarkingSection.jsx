import { remote } from 'electron';
import React, { Component } from 'react';
import fs from 'fs-extra';
import $, { trim } from 'jquery';
import jschardet from 'jschardet';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { addOutput } from './RightView';
import IssueInput from './IssueInput';

const dialog = remote.dialog;


class MarkingSection extends Component {
    constructor(props) {
        super(props);

        let dataFiles = fs.readdirSync(props.state.dataDir);
        this.state = {
            students: createStudentsList(props.state.dataDir, dataFiles),
            index: 0,
            files: [],
            compileStatus: {},
            encodings: {},
            binDir: fs.mkdtempSync(os.tmpdir() + "/korrekturToolTmp") + "/",
            points: {},
            issuePoints: {}
        }

        this.handleRun = this.handleRun.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleAddIssue = this.handleAddIssue.bind(this);
        this.handlePrevNext = this.handlePrevNext.bind(this);
        this.handleShowOutput = this.handleShowOutput.bind(this);
        this.handleCheckFiles = this.handleCheckFiles.bind(this);

        if (this.props.setRunListener)
            this.props.setRunListener(this.handleRun);
    }

    componentDidMount() {
        this.studentChanged();
    }

    studentChanged() {
        this.setState((state, props) => {
            const files = fs.readdirSync(state.students[state.index].dirPath).filter((name) => name !== "onlinetext_assignsubmission_onlinetext.html");
            const basePath = state.students[state.index].dirPath + "/";
            var encodings = {}, compileStatus = {};
            for (var i in files) {
                encodings[files[i]] = null;
                compileStatus[files[i]] = null;
            }
            return {
                encodings: encodings,
                compileStatus: compileStatus,
                files: files,
                points: {},
                issuePoints: {}
            };
        });
    }

    checkCompileStatus(fileName, basePath) {
        const compilePath = this.state.binDir + fileName;
        fs.copy(basePath + fileName, compilePath)
            .then(() => {
                exec(`javac -encoding utf-8 -cp "${this.state.binDir}" "${compilePath}"`, (err, stdout, stderr) => {
                    if (err) {
                        console.error("Kompilierfehler für " + fileName + ":\n" + stderr);
                    }
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

    handleRun(file) {
        const fileName = path.basename(file);
        if (this.state.compileStatus[fileName] !== "success") {
            dialog.showErrorBox("Fehler", "Das Program konnte nicht kompiliert werden!");
            return;
        }

        exec(`java -cp "${this.state.binDir}" ${fileName.replace(".java", "")}`, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                console.error(stderr);
                dialog.showErrorBox("Fehler", "Beim Ausführen des Programs ist ein Fehler aufgetreten:\n\n" + stderr);
                return;
            }

            if (stderr) addOutput(stderr, "error");
            if (stdout) addOutput(stdout);
        });
    }

    handlePrevNext(event) {
        let target = event.target;
        if (target.tagName === "I") {
            target = target.parentNode;
        }
        if (target.className.indexOf("btn-prev") >= 0) {
            this.setState((state, props) => { return { index: state.index - 1 }; })
            this.studentChanged();
        }
        else if (target.className.indexOf("btn-next") >= 0) {
            this.setState((state, props) => { return { index: state.index + 1 }; })
            this.studentChanged();
        }
    }

    handleChange(event) {
        const exercise = event.target.dataset.exercise;
        let newValue = parseFloat(event.target.value, 10);
        if (newValue > 0) newValue = 0;
        this.setState((state, props) => {
            const points = state.points;
            points[exercise] = newValue;
            return { points: points };
        });
    }

    handleAddIssue(event) {
        if (event.keyCode && event.keyCode !== 13)
            return;
        if (this.props.onIssueAdd) {
            const parent = $(event.target).parents(".issue-input");
            const textInput = parent.find("input[type='text']");
            const pointsInput = parent.find("input[type='number']");
            if (!this.props.onIssueAdd(parent.data("exercise"), textInput.val(), pointsInput.val()))
                return;
            textInput.val("").focus();
            pointsInput.val("");
        }
    }

    handleCheckFiles(event) {
        const basePath = this.state.students[this.state.index].dirPath + "/";
        const compileStatus = this.state.compileStatus;
        const encodings = {};
        const files = this.state.files;

        $.each(this.props.state.compileDependencies, (i, file) => {
            fs.copySync(file, this.state.binDir + path.basename(file));
        });

        for (var i in files) {
            encodings[files[i]] = getFileEncoding(basePath + files[i]);
            if (files[i].endsWith(".java")) {
                compileStatus[files[i]] = undefined;
                this.checkCompileStatus(files[i], basePath);
            }
        }
        this.setState({
            compileStatus: compileStatus,
            encodings: encodings
        })
    }

    renderFiles() {
        const basePath = this.state.students[this.state.index].dirPath + "/";
        const files = this.state.files;
        var fileElements = [];
        for (var i in files) {
            let compileStatus = getCompileInfo(this.state.compileStatus[files[i]]);
            if (compileStatus)
                compileStatus = <div className="col">{compileStatus}</div>;
            fileElements.push(<div className="row" key={"file-" + i}>
                <div className="col">
                    {getFileIcon(files[i])}
                    <a className="file-link" onClick={this.props.onShowFile} data-file={basePath + files[i]}>
                        {files[i]}
                    </a>
                </div>
                {compileStatus}
                <div className="col-4">{getEncodingInfo(this.state.encodings[files[i]])}</div>
            </div>);
        }
        return fileElements;
    }

    renderIssueInputs(exercise) {
        let inputs = [];
        $.each(this.props.state.exercises[exercise].issues, (i, issue) => {
            inputs.push(
                <IssueInput key={"issue-" + exercise + "-" + i} exercise={exercise} id={i} text={issue.text} points={issue.points}
                    onChange={(key, value) => {
                        if (key === "checked") {
                            const exerc = exercise;
                            this.setState((state, props) => {
                                const issuePoints = state.issuePoints;
                                issuePoints[exerc] = (issuePoints[exerc] || 0) + (value ? 1 : -1) * this.props.state.exercises[exerc].issues[i].points;
                                return {
                                    issuePoints: issuePoints
                                };
                            });
                        }
                        else if (this.props.onIssueChange)
                            this.props.onIssueChange(exercise, i, key, value);
                    }}
                    onDelete={() => {
                        if (this.props.onIssueDelete) {
                            this.props.onIssueDelete(exercise, i);
                        }
                    }} />
            );
        });
        return inputs;
    }

    renderExercises() {
        if (this.props.state.minExercise <= 0 || this.props.state.maxExercise <= 0)
            return "";

        let exercises = [];
        for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
            let points = this.state.points[i];
            if (points === undefined || points === null || isNaN(points)) points = "";
            exercises.push(<div key={"exercise-" + i}>
                <h4 className="heading-margin">Aufgabe {this.props.state.blatt}.{i}</h4>
                <div className="row">
                    <div className="col points">
                        {this.getPointsForExercise(i)} / {this.props.state.exercises[i].maxPoints || 0}
                        <input type="number" className="form-control form-control-sm" data-exercise={i} onChange={this.handleChange} value={points}></input>
                    </div>
                    <div className="col">
                        <div className="list-group">
                            {this.renderIssueInputs(i)}
                            <div className="list-group-item issue-input editable" data-exercise={i}>
                                <div className="form-row">
                                    <div className="col-1 add-issue" onClick={this.handleAddIssue}><i className="fa fa-plus"></i></div>
                                    <div className="col"><input className="form-control" type="text" onKeyUp={this.handleAddIssue}></input></div>
                                    <div className="col-2"><input className="form-control" type="number" onKeyUp={this.handleAddIssue}></input></div>
                                </div>
                            </div>
                        </div>
                        <textarea id={"exercise-" + i + "-text"} className="form-control"></textarea>
                    </div>
                </div>
            </div>);
        }
        return exercises;
    }

    handleShowOutput(event) {
        let output = '<table style="border: 2px solid #333">\n';
        output += '<tr style="border: 2px solid black"><th><b>Aufgabe</b></th><th><b>Bewertung</b></th><th><b>Kommentar</b></th></tr>\n';

        for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
            output += '<tr style="border-bottom: 1px solid #333">\n';
            output += `<td style="text-align: center; vertical-align: middle"><b>${this.props.state.blatt}.${i}</b></td>\n`;
            output += `<td style="text-align: center; vertical-align: middle">${this.getPointsForExercise(i)} / ${(this.props.state.exercises[i] || {}).maxPoints}</td>\n`;
            output += '<td>';
            let perfect = true;
            $.each(this.props.state.exercises[i].issues, (j, issue) => {
                if ($(`#issue-${i}-${j}`).data("checked")) {
                    output += `${issue.text} [${issue.points}]<br />\n`;
                    perfect = false;
                }
            });
            output += $('#exercise-' + i + '-text').val().replace("\n", "<br />") || (perfect ? "Passt" : "");
            output += '</td>\n</tr>\n';
        }
        output += '</table>\n';
        output += '<br />\n';
        output += `<p><b>Gesamt (Σ): ${this.getTotalPoints()} von ${this.getMaxPoints()}</b></p>`;

        $("#modal .modal-title").text("Output");
        $("#modal .btn-primary").text("Kopieren").click(() => {
            $("textarea.output").select();
            document.execCommand('copy');
        });
        if ($("textarte.output").length) {
            $("textarea.output").html(output);
        }
        else {
            $("#modal .modal-body").append('<textarea class="form-control output">' + output + "</textarea>");
        }
        $("textarea.output").css("height", Math.max($(window).height() - 275, 300) + "px");
    }

    render() {
        return (
            <div className="marking-section">
                <hr />
                <div className="row">
                    <div className="col">
                        <h3>{this.state.students[this.state.index].dirName}</h3>
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
                <h3 className="heading-margin">Dateien <button type="button" className="btn btn-primary" onClick={this.handleCheckFiles}>Prüfen</button></h3>
                {this.renderFiles()}
                <hr />
                <h3 className="heading-margin">Aufgaben ({this.getTotalPoints() || "0"} / {this.getMaxPoints() || "?"})</h3>
                {this.renderExercises()}
                <button className="btn btn-primary" data-toggle="modal" data-target="#modal" onClick={this.handleShowOutput}>HTML</button>
            </div>
        );
    }

    getTotalPoints() {
        var points = 0;
        for (let i in this.props.state.exercises) {
            points += this.getPointsForExercise(i);
        }
        return points;
    }

    getMaxPoints() {
        var maxPoints = 0;
        for (let i in this.props.state.exercises) {
            maxPoints += this.props.state.exercises[i].maxPoints;
        }
        return maxPoints;
    }

    getPointsForExercise(exercise) {
        let diff = (this.state.points[exercise] || 0) + (this.state.issuePoints[exercise] || 0);
        return Math.max((this.props.state.exercises[exercise].maxPoints || 0) + (diff < 0 ? diff : 0), 0);
    }
}

function createStudentsList(dataDir, files) {
    var splitName, students = [];
    for (var i in files) {
        if (!fs.statSync(dataDir + "/" + files[i]).isDirectory())
            continue;
        students.push({
            dirName: files[i],
            dirPath: dataDir + "/" + files[i]
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
    if (filePath.endsWith(".pdf")) return null;
    const fileBuffer = fs.readFileSync(filePath);
    return (jschardet.detect(fileBuffer).encoding || "").toUpperCase();
}

export default MarkingSection;
