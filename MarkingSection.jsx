import { remote, shell } from 'electron';
import React, { Component } from 'react';
import fs from 'fs-extra';
import $ from 'jquery';
import chardet from 'chardet';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { addOutput } from './RightView';
import IssueInput from './IssueInput';
import CompileError from './CompileError';

const dialog = remote.dialog;

class MarkingSection extends Component {
  constructor(props) {
    super(props);

    let dataFiles = fs.readdirSync(props.state.dataDir);
    this.state = {
      students: createStudentsList(props.state.dataDir, dataFiles),
      index: 0,
      files: [],
      binDir: fs.mkdtempSync(os.tmpdir() + '/korrekturToolTmp') + '/',
      points: {},
      issuePoints: {},
    };

    this.handleRun = this.handleRun.bind(this);
    this.handleAddIssue = this.handleAddIssue.bind(this);
    this.handlePrevNext = this.handlePrevNext.bind(this);
    this.handleOpenFiles = this.handleOpenFiles.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleSaveOutput = this.handleSaveOutput.bind(this);
    this.handleShowOutput = this.handleShowOutput.bind(this);
    this.handleCheckFiles = this.handleCheckFiles.bind(this);
    this.handleCopyFiles = this.handleCopyFiles.bind(this);
    this.handlePointsChange = this.handlePointsChange.bind(this);

    if (this.props.setRunListener) this.props.setRunListener(this.handleRun);
    this.resetListeners = [];
  }

  componentDidMount() {
    this.studentChanged();
  }

  studentChanged() {
    this.setState((state, props) => {
      let files = {};
      fs.readdirSync(state.students[state.index].dirPath)
        .filter(name => name !== 'onlinetext_assignsubmission_onlinetext.html')
        .forEach(fileName => {
          files[fileName] = {
            encoding: null,
            compileStatus: null,
            compileError: null,
          };
        });
      return {
        files: files,
        points: {},
        issuePoints: {},
      };
    });
    $.each(this.resetListeners, (i, e) => e());
    for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
      $('#exercise-' + i + '-text').val('');
    }
  }

  checkCompileStatus(fileName) {
    const compilePath = this.state.binDir + fileName;
    fs.copy(path.join(this.getBasePath(), fileName), compilePath)
      .then(() => {
        exec(`javac -encoding utf-8 -cp "${this.state.binDir}" "${compilePath}"`, (err, stdout, stderr) => {
          this.setState((state, props) => {
            let file = state.files[fileName];
            if (err) {
              file.compileStatus = 'error';
              file.compileError = stderr;
            } else file.compileStatus = 'success';
            return { files: state.files };
          });
        });
      })
      .catch(err => console.error(err));
  }

  handleRun(file) {
    const fileName = path.basename(file);
    switch (this.state.files[fileName].compileStatus) {
      case 'success':
        break;
      case 'compiling':
        return;
      case 'error':
        dialog.showErrorBox('Kompilierfehler', this.state.files[fileName].compileError);
        return;
      default:
        this.setState((state, props) => {
          state.files[fileName].compileStatus = 'compiling';
          return { files: state.files };
        });
        this.checkCompileStatus(fileName);
        return;
    }

    exec(
      `java -Dfile.encoding=UTF-8 -cp "${this.state.binDir}" ${fileName.replace('.java', '')}`,
      (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          console.error(stderr);
          dialog.showErrorBox('Fehler', 'Beim Ausführen des Programs ist ein Fehler aufgetreten:\n\n' + stderr);
          return;
        }

        if (stderr) addOutput(stderr, 'error');
        if (stdout) addOutput(stdout);
      }
    );
  }

  handlePrevNext(event) {
    let target = event.target;
    if (target.tagName === 'I') {
      target = target.parentNode;
    }
    if (target.className.indexOf('btn-prev') >= 0) {
      this.setState((state, props) => {
        return { index: state.index - 1 };
      });
      this.studentChanged();
    } else if (target.className.indexOf('btn-next') >= 0) {
      this.setState((state, props) => {
        return { index: state.index + 1 };
      });
      this.studentChanged();
    }
  }

  handlePointsChange(event) {
    const exercise = event.target.dataset.exercise;
    let newValue = parseFloat(event.target.value, 10);
    if (newValue > 0) newValue = 0;
    this.setState((state, props) => {
      const points = state.points;
      points[exercise] = newValue;
      return { points: points };
    });
  }

  handleTextChange(event) {
    let newPoints = 0;
    let array = event.target.value.match(/.*\[.*\]/g);
    for (let i in array) {
      let s = array[i]
        .match(/\[.*\]/)[0]
        .replace('[', '')
        .replace(']', '')
        .replace(',', '.');
      newPoints += parseFloat(s, 10);
    }
    const exercise = event.target.dataset.exercise;
    this.setState((state, props) => {
      const points = state.points;
      points[exercise] = newPoints;
      return { points: points };
    });
  }

  handleAddIssue(event) {
    if (event.keyCode && event.keyCode !== 13) return;
    if (this.props.onIssueAdd) {
      const parent = $(event.target).parents('.issue-input');
      const textInput = parent.find("input[type='text']");
      const pointsInput = parent.find("input[type='number']");
      if (!this.props.onIssueAdd(parent.data('exercise'), textInput.val(), pointsInput.val())) return;
      textInput.val('').focus();
      pointsInput.val('');
    }
  }

  handleOpenFiles(event) {
    shell.openItem(this.state.students[this.state.index].dirPath);
  }

  handleCheckFiles(event) {
    const basePath = this.getBasePath();
    const files = this.state.files;

    $.each(this.props.state.compileDependencies, (i, file) => {
      fs.copySync(file, this.state.binDir + path.basename(file));
    });

    for (let fileName in files) {
      files[fileName].encoding = getFileEncoding(path.join(basePath, fileName));
      if (fileName.endsWith('.java')) {
        files[fileName].compileStatus = 'compiling';
        this.checkCompileStatus(fileName);
      }
    }
    this.setState({ files: files });
  }

  handleCopyFiles() {
    let targetDir = this.props.state.workspaceDir;
    if (!targetDir) return;

    // Remove old files
    fs.readdirSync(targetDir)
      .filter(fileName => fileName.endsWith('.java') && !fileName.startsWith('__') && fileName != 'Terminal.java')
      .forEach(fileName => fs.remove(path.join(targetDir, fileName)));

    // Copy new files
    for (let fileName in this.state.files) {
      if (fileName.endsWith('.java')) fs.copy(path.join(this.getBasePath(), fileName), path.join(targetDir, fileName));
    }
  }

  renderFiles() {
    const basePath = this.getBasePath() + '/';
    const files = this.state.files;
    let fileElements = [];
    for (let fileName in files) {
      let compileStatus = getCompileInfo(files[fileName]);
      if (compileStatus) compileStatus = <div className="col">{compileStatus}</div>;
      fileElements.push(
        <div className="row" key={'file-' + fileName}>
          <div className="col">
            {getFileIcon(fileName)}
            <a className="file-link" onClick={this.props.onShowFile} data-file={basePath + fileName}>
              {fileName}
            </a>
          </div>
          {compileStatus}
          <div className="col-4">{getEncodingInfo(files[fileName].encoding)}</div>
        </div>
      );
    }
    return fileElements;
  }

  renderIssueInputs(exercise) {
    let inputs = [];
    $.each(this.props.state.exercises[exercise].issues, (i, issue) => {
      inputs.push(
        <IssueInput
          key={'issue-' + exercise + '-' + i}
          exercise={exercise}
          id={i}
          text={issue.text}
          points={issue.points}
          onChange={(key, value) => {
            if (key === 'checked') {
              const exerc = exercise;
              this.setState((state, props) => {
                const issuePoints = state.issuePoints;
                issuePoints[exerc] =
                  (issuePoints[exerc] || 0) + (value ? 1 : -1) * this.props.state.exercises[exerc].issues[i].points;
                return {
                  issuePoints: issuePoints,
                };
              });
            } else if (this.props.onIssueChange) this.props.onIssueChange(exercise, i, key, value);
          }}
          onDelete={() => {
            if (this.props.onIssueDelete) {
              this.props.onIssueDelete(exercise, i);
            }
          }}
          resetListeners={this.resetListeners}
        />
      );
    });
    return inputs;
  }

  renderExercises() {
    if (this.props.state.minExercise <= 0 || this.props.state.maxExercise <= 0) return '';

    let exercises = [];
    for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
      let points = this.state.points[i];
      if (points === undefined || points === null || isNaN(points)) points = '';
      exercises.push(
        <div key={'exercise-' + i} className="exercise">
          <h4 className="heading-margin">
            Aufgabe {this.props.state.blatt}.{i}
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => {
                if (this.props.onSortIssues) this.props.onSortIssues(i);
              }}
            >
              <i className="fa fa-sort-amount-asc" />
            </button>
          </h4>
          <div className="row">
            <div className="col points">
              {this.getPointsForExercise(i)} / {this.props.state.exercises[i].maxPoints || 0}
              <input
                type="number"
                className="form-control form-control-sm"
                data-exercise={i}
                onChange={this.handlePointsChange}
                value={points}
              />
            </div>
            <div className="col">
              <div className="list-group">
                {this.renderIssueInputs(i)}
                <div className="list-group-item issue-input editable" data-exercise={i}>
                  <div className="form-row">
                    <div className="col-1 add-issue" onClick={this.handleAddIssue}>
                      <i className="fa fa-plus" />
                    </div>
                    <div className="col">
                      <input className="form-control" type="text" onKeyUp={this.handleAddIssue} />
                    </div>
                    <div className="col-2">
                      <input className="form-control" type="number" onKeyUp={this.handleAddIssue} />
                    </div>
                  </div>
                </div>
              </div>
              <textarea
                id={'exercise-' + i + '-text'}
                className="form-control"
                data-exercise={i}
                onChange={this.handleTextChange}
              />
            </div>
          </div>
        </div>
      );
    }
    return exercises;
  }

  getHTMLOutput() {
    let output = '<table style="border: 2px solid #333">\n';
    output +=
      '<tr style="border: 2px solid black"><th><b>Aufgabe</b></th><th><b>Bewertung</b></th><th><b>Kommentar</b></th></tr>\n';

    for (let i = this.props.state.minExercise; i <= this.props.state.maxExercise; i++) {
      output += '<tr style="border-bottom: 1px solid #333">\n';
      output += `<td style="text-align: center; vertical-align: middle"><b>${this.props.state.blatt}.${i}</b></td>\n`;
      output += `<td style="text-align: center; vertical-align: middle">${this.getPointsForExercise(i)} / ${
        (this.props.state.exercises[i] || {}).maxPoints
      }</td>\n`;
      output += '<td>';
      let perfect = true;
      $.each(this.props.state.exercises[i].issues, (j, issue) => {
        if ($(`#issue-${i}-${j}`).attr('data-checked') === 'true') {
          if (issue.points) output += `${issue.text} [${issue.points}]<br />\n`;
          else output += `${issue.text}<br />\n`;
          perfect = false;
        }
      });
      output +=
        $('#exercise-' + i + '-text')
          .val()
          .replace(/\n/g, '<br />\n') || (perfect ? 'Passt' : '');
      output += '</td>\n</tr>\n';
    }
    output += '</table>\n';
    output += '<br />\n';
    output += `<p><b>Gesamt (Σ): ${this.getTotalPoints()} von ${this.getMaxPoints()}</b></p>\n`;
    output +=
      '<p><small style="color: grey">Fragen oder Beschwerden entweder per E-mail an <a href="mailto:benedikt.werner@tum.de">benedikt.werner@tum.de</a> oder auf Telegram an <a href="https://t.me/benediktwerner">@benediktwerner</a></small></p>';
    return output;
  }

  handleShowOutput(event) {
    $('#modal .modal-title').text('Output');
    $('#modal .btn-primary')
      .text('Kopieren')
      .click(() => {
        $('textarea.output').select();
        document.execCommand('copy');
      });
    if ($('textarea.output').length) {
      $('textarea.output').text(this.getHTMLOutput());
    } else {
      $('#modal .modal-body').append('<textarea class="form-control output">' + this.getHTMLOutput() + '</textarea>');
    }
    $('textarea.output').css('height', Math.max($(window).height() - 275, 300) + 'px');
  }

  handleSaveOutput(event) {
    const fileName = this.state.students[this.state.index].dirName.split('_')[0] + '.txt';
    dialog.showSaveDialog({ defaultPath: fileName }, fileName => {
      if (fileName === undefined) return;

      fs.writeFile(fileName, this.getTotalPoints() + '\n' + this.getHTMLOutput(), err => {
        if (err) {
          console.error(err);
          dialog.showErrorBox('Fehler beim Speichern', err);
        }
      });
    });
  }

  render() {
    return (
      <div className="marking-section">
        <div className="row">
          <div className="col">
            <h3>{this.state.students[this.state.index].dirName.split('_')[0]}</h3>
          </div>
          <div className="col-auto align-right valign-content-middle">
            <span className="indexer">
              {this.state.index + 1} / {this.state.students.length}
            </span>
            <button
              type="button"
              className="btn btn-outline-primary btn-prev"
              onClick={this.handlePrevNext}
              disabled={this.state.index <= 0}
            >
              <i className="fa fa-arrow-left fa-lg" />
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-next"
              onClick={this.handlePrevNext}
              disabled={this.state.index >= this.state.students.length - 1}
            >
              Next
              <i className="fa fa-arrow-right fa-lg" />
            </button>
          </div>
        </div>
        <h3 className="heading-margin">
          Dateien
          <button type="button" className="btn btn-primary" onClick={this.handleOpenFiles}>
            Öffnen
          </button>
          <button type="button" className="btn btn-primary" onClick={this.handleCheckFiles}>
            Prüfen
          </button>
          <button type="button" className="btn btn-primary" onClick={this.handleCopyFiles}>
            Kopieren
          </button>
        </h3>
        {this.renderFiles()}
        <hr />
        <h3 className="heading-margin">
          Aufgaben ({this.getTotalPoints() || '0'} / {this.getMaxPoints() || '?'})
        </h3>
        {this.renderExercises()}
        <button className="btn btn-primary mt-4" data-toggle="modal" data-target="#modal" onClick={this.handleShowOutput}>
          HTML
        </button>
        <button className="btn btn-primary mt-4" onClick={this.handleSaveOutput}>
          Speichern
        </button>
      </div>
    );
  }

  getTotalPoints() {
    let points = 0;
    for (let i in this.props.state.exercises) {
      points += this.getPointsForExercise(i);
    }
    return points;
  }

  getMaxPoints() {
    let maxPoints = 0;
    for (let i in this.props.state.exercises) {
      maxPoints += this.props.state.exercises[i].maxPoints;
    }
    return maxPoints;
  }

  getPointsForExercise(exercise) {
    let diff = (this.state.points[exercise] || 0) + (this.state.issuePoints[exercise] || 0);
    return Math.max((this.props.state.exercises[exercise].maxPoints || 0) + (diff < 0 ? diff : 0), 0);
  }

  getBasePath() {
    return this.state.students[this.state.index].dirPath;
  }
}

function createStudentsList(dataDir, files) {
  let students = [];
  for (let i in files) {
    if (!fs.statSync(dataDir + '/' + files[i]).isDirectory()) continue;
    students.push({
      dirName: files[i],
      dirPath: dataDir + '/' + files[i],
    });
  }
  return students;
}

function getFileIcon(fileName) {
  if (fileName.endsWith('.pdf')) {
    return <i className="fa fa-file-pdf-o fa-padding" />;
  } else if (fileName.endsWith('.java')) {
    return <i className="icon-java-bold fa-lg" />;
  } else if (fileName.endsWith('.txt')) {
    return <i className="fa fa-file-text-o fa-padding" />;
  }
  return <i className="fa fa-file-o fa-padding" />;
}

function getCompileInfo(file) {
  switch (file.compileStatus) {
    case 'compiling':
      return (
        <span>
          <i className="fa fa-spinner fa-pulse fa-fw" />
          Kompiliere
        </span>
      );
    case 'success':
      return (
        <span>
          <i className="fa fa-check-circle fa-padding" />
          Kompiliert
        </span>
      );
    case 'error':
      return <CompileError errorMessage={file.compileError} />;
    default:
      return '';
  }
}

function getEncodingInfo(encoding) {
  if (!encoding) {
    return (
      <span>
        <i className="fa fa-question-circle fa-padding" />
        Unbekannt
      </span>
    );
  }
  if (encoding === 'ASCII' || encoding === 'UTF-8') {
    return (
      <span>
        <i className="fa fa-check-circle fa-padding" />
        {encoding}
      </span>
    );
  }
  return (
    <span>
      <i className="fa fa-times-circle fa-padding" />
      {encoding}
    </span>
  );
}

function isASCIIEncoded(buffer) {
  for (let c of buffer) {
    if (c > 127) return false;
  }
  return true;
}

function hasBOMHeader(buffer) {
  return buffer[0] == 239 && buffer[1] == 187 && buffer[2] == 191;
}

function getFileEncoding(filePath) {
  if (filePath.endsWith('.pdf')) return null;

  const fileBuffer = fs.readFileSync(filePath);
  if (isASCIIEncoded(fileBuffer)) return 'ASCII';

  let encoding = chardet.detect(fileBuffer);
  if (encoding == 'UTF-8' && hasBOMHeader(fileBuffer)) return 'UTF-8 with BOM';

  return encoding;
}

export default MarkingSection;
