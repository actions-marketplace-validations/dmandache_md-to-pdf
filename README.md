# Markdown to PDF action

[![Tests](https://github.com/dmandache/md-to-pdf/actions/workflows/test.yml/badge.svg)](https://github.com/dmandache/md-to-pdf/actions/workflows/test.yml)
[![Build example PDF](https://github.com/dmandache/md-to-pdf/actions/workflows/example.yml/badge.svg)](https://github.com/dmandache/md-to-pdf/actions/workflows/example.yml)
[![Latest release](https://img.shields.io/github/v/release/dmandache/md-to-pdf)](https://github.com/dmandache/md-to-pdf/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Views](https://hits.sh/github.com/dmandache/md-to-pdf.svg?label=README%20views)

Render a Markdown file to a GitHub-styled A4 PDF with clickable heading links, images, and page numbers. Heading IDs follow GitHub's slug conventions, including duplicate headings. The action fails if an internal fragment link has no target or an image fails to load.

## Usage

Add `.github/workflows/pdf.yml` to the repository containing the Markdown:

```yaml
name: Build PDF
on:
  push:
    paths:
      - README.md
      - figures/**
      - .github/workflows/pdf.yml
  workflow_dispatch:
permissions:
  contents: read
jobs:
  pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dmandache/md-to-pdf@v1.0.0
        with:
          input: README.md
          output: documentation.pdf
      - uses: actions/upload-artifact@v4
        with:
          name: documentation-pdf
          path: documentation.pdf
```

Download the PDF from the workflow run's **Artifacts** section. To version the PDF in your repository instead, add a commit step to your own workflow and grant it `contents: write` permission.

For a document showcasing a table of contents, a local figure, tables, and links, see [the example](example/document.md). To render it, set `input: example/document.md` and `output: example/documents.pdf` in the workflow above; include `example/**` in `push.paths` so changes to the document and figure trigger a rebuild.

This repository also has a **Build example PDF** workflow. It runs when the example or renderer changes on `main` and can be started manually from the Actions tab on `main`. It commits `example/documents.pdf` to `main` and uploads it as the **example-pdf** artifact.

| Input | Default | Description |
| --- | --- | --- |
| `input` | `README.md` | Path to the Markdown file, relative to the caller's working directory. |
| `output` | `document.pdf` | PDF path relative to the caller's working directory; its parent directory must exist. |

The workflow must check out its repository before invoking the action. Use an Ubuntu runner: the action installs Chromium and its system dependencies. Playwright 1.61 supports Ubuntu 24.04 and 26.04. Relative images are served from the Markdown file's directory; keep them within that directory. The caller's `push.paths` should include its image directories so image changes trigger a rebuild.

The renderer supports Markdown and raw HTML using markdown-it; it does not reproduce every GitHub Markdown extension. Provide only trusted Markdown and assets: raw HTML and external resources are loaded during rendering. Do not run the action on untrusted pull request content with write permissions or secrets.

## Development

With Node.js 22 installed:

```bash
npm install
npx playwright install --with-deps chromium
MARKDOWN_INPUT=test/document.md PDF_OUTPUT=test-document.pdf node render.cjs
```

The included workflow exercises the action on Ubuntu 24.04 and `ubuntu-latest`, checks that the PDF contains internal and external links, and verifies that a broken fragment fails the build. The action installs exact direct dependency versions, but transitive dependencies are not locked.

Publishing a stable release with a tag such as `v1.0.0` automatically updates the corresponding major tag (`v1`) to the release commit. Prereleases and tags outside the `vMAJOR.MINOR.PATCH` format are skipped. Publish releases in version order to avoid moving a major tag back to an older version.
