# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A personal portfolio website for Nhlamulo Shingange, built with plain static HTML — no CSS files, JavaScript, build system, package manager, linters, or tests. Pages are hand-written HTML opened directly in a browser.

## Structure

- `index.html` — main portfolio page (summary, education, work experience, skills, awards), links to the other two pages
- `Hobbies.html` — hobbies list
- `Contact  Me.html` — contact details (note: the filename contains **two spaces** between "Contact" and "Me"; `index.html` links to it as `./Contact  Me.html`, so renaming it requires updating that link)
- `Professional picture.jpeg` — profile photo referenced from `index.html`

## Development

There are no build, lint, or test commands. To preview changes, open the HTML files in a browser, or serve the directory locally:

```bash
python3 -m http.server 8000
```

## Conventions

- All asset and page references use relative paths (`./...`), and several filenames contain spaces — keep links and filenames exactly in sync, including the double space in `Contact  Me.html`.
- Pages share the same boilerplate `<head>` (UTF-8 charset, responsive viewport meta) but no shared stylesheet; styling, if added, would need to be wired into each page.
