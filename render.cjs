const fs = require("fs");
const path = require("path");
const express = require("express");
const MarkdownIt = require("markdown-it");
const { chromium } = require("playwright");

async function main() {
  const { default: GithubSlugger } = await import("github-slugger");
  const markdownPath = path.resolve(process.env.MARKDOWN_INPUT || "README.md");
  const documentDir = path.dirname(markdownPath);
  const markdown = fs.readFileSync(markdownPath, "utf8");

  const cssPath = require.resolve(
    "github-markdown-css/github-markdown-light.css"
  );
  const githubCss = fs.readFileSync(cssPath, "utf8");

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Match GitHub's heading anchors, including duplicate headings.
  const slugger = new GithubSlugger();
  md.renderer.rules.heading_open = (tokens, index, options, _env, renderer) => {
    const heading = tokens[index + 1];
    const text = heading.children
      .filter((token) => ["text", "code_inline", "image"].includes(token.type))
      .map((token) => token.content)
      .join("");
    tokens[index].attrSet("id", slugger.slug(text));
    return renderer.renderToken(tokens, index, options);
  };

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${githubCss}</style>
        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          body {
            margin: 0;
          }

          .markdown-body {
            font-size: 10pt;
            line-height: 1.5;
          }

          .markdown-body img {
            display: block;
            max-width: 100%;
            max-height: 235mm;
            margin: 0 auto;
            object-fit: contain;
          }

          .markdown-body table {
            display: table;
            width: 100%;
            font-size: 9pt;
          }

          .markdown-body pre {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          h1, h2, h3, h4 {
            break-after: avoid;
          }

          img, table, pre, blockquote {
            break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <article class="markdown-body">
          ${md.render(markdown)}
        </article>
      </body>
    </html>
  `;

  // Serve images relative to the Markdown file.
  const app = express();
  app.get("/__preview__", (_req, res) => res.send(html));
  app.use(express.static(documentDir));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const port = server.address().port;

    await page.goto(`http://127.0.0.1:${port}/__preview__`, {
      waitUntil: "networkidle",
    });

    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
        .filter((href) => !document.getElementById(decodeURIComponent(href.slice(1))))
    );
    if (brokenAnchors.length) {
      throw new Error(`Could not find link targets: ${brokenAnchors.join(", ")}`);
    }

    // Fail clearly if an image path is wrong or an image cannot load.
    const brokenImages = await page.locator("img").evaluateAll((images) =>
      images
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src"))
    );

    if (brokenImages.length) {
      throw new Error(`Could not load images: ${brokenImages.join(", ")}`);
    }

    await page.pdf({
      path: path.resolve(process.env.PDF_OUTPUT || "document.pdf"),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #586069;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
