#!/usr/bin/env python3

import json
import os
import pyperclip
import sys


def load_grade_file(grades_dir, fileName):
    name = fileName[:-4]
    result = {}

    with open(os.path.join(grades_dir, fileName)) as f:
        result["grade"] = float(f.readline().strip())
        result["feedback"] = f.read()

    return name, result


def get_snippet(grades):
    with open("snippet.js") as f:
        return f.read().replace("XXXXX", json.dumps(grades))


def main():
    if len(sys.argv) != 2:
        print("Usage:", sys.argv[0], "[grades directory]")
        return

    grades_dir = sys.argv[1]
    if not os.path.isdir(grades_dir):
        print("Error:", grades_dir, "is not a directory")
        return

    grades = {}
    for fileName in os.listdir(grades_dir):
        if fileName.endswith(".txt"):
            name, grade = load_grade_file(grades_dir, fileName)
            grades[name] = grade

    pyperclip.copy(get_snippet(grades))
    print("Snippet copied to clipboard. Paste it into the JS Console to set the grades.")


if __name__ == '__main__':
    main()
