# Markdown to PDF action

Render a Markdown file to a GitHub-styled A4 PDF with clickable heading links, images, and page numbers. Heading IDs follow GitHub's slug conventions, including duplicate headings. The action fails if an internal fragment link has no target or an image fails to load.

## Usage

Publish this directory as a GitHub repository, create a `v1` tag, and replace `OWNER/markdown-to-pdf` below with its repository name. In the repository containing the Markdown, add `.github/workflows/pdf.yml`:

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
      - uses: OWNER/markdown-to-pdf@v1
        with:
          input: README.md
          output: documentation.pdf
      - uses: actions/upload-artifact@v4
        with:
          name: documentation-pdf
          path: documentation.pdf
```

Download the PDF from the workflow run's **Artifacts** section. To version the PDF in your repository instead, add a commit step to your own workflow and grant it `contents: write` permission.

| Input | Default | Description |
| --- | --- | --- |
| `input` | `README.md` | Path to the Markdown file, relative to the caller's working directory. |
| `output` | `document.pdf` | PDF path relative to the caller's working directory; its parent directory must exist. |

The workflow must check out its repository before invoking the action. Use a Linux runner: the action installs Chromium and its system dependencies. Relative images are served from the Markdown file's directory; keep them within that directory. The caller's `push.paths` should include its image directories so image changes trigger a rebuild.

The renderer supports Markdown and raw HTML using markdown-it; it does not reproduce every GitHub Markdown extension. Provide only trusted Markdown and assets: raw HTML and external resources are loaded during rendering. Do not run the action on untrusted pull request content with write permissions or secrets.

## Development

With Node.js 22 installed:

```bash
npm install
npx playwright install --with-deps chromium
MARKDOWN_INPUT=test/document.md PDF_OUTPUT=test-document.pdf node render.cjs
```

The included workflow exercises the action, checks that the PDF contains internal and external links, and verifies that a broken fragment fails the build. The action installs exact direct dependency versions, but transitive dependencies are not locked.
