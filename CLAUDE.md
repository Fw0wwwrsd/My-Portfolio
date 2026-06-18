# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A personal portfolio website for Nhlamulo Shingange, built with plain static HTML. There is no build system, package manager, framework, test suite, or linter — the site is just HTML files served directly.

## Structure

- `index.html` — main portfolio page (summary, education, work experience, skills, awards), with links to the other two pages
- `Hobbies.html` — hobbies list
- `Contact  Me.html` — contact details. Note: the filename contains **two spaces** between "Contact" and "Me". Links to it (e.g., in `index.html`) must match exactly (`./Contact  Me.html`)
- `Professional picture.jpeg` — profile photo referenced by `index.html` (filename contains a space)

## Development

There are no build, test, or lint commands. To preview changes, open the HTML files directly in a browser, or serve the directory locally:

```bash
python3 -m http.server 8000
```

## Conventions

- No external CSS or JavaScript files; all content is inline HTML
- Pages are standalone HTML documents linked via relative paths; preserve the exact (space-containing) filenames or update all references together
