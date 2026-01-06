# How to Convert Documentation to PDF

## Option 1: Using Pandoc (Recommended)

### Install Pandoc
```bash
# Ubuntu/Debian
sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended

# macOS
brew install pandoc basictex

# Windows
# Download from: https://pandoc.org/installing.html
```

### Convert to PDF
```bash
cd "/mnt/5042D51642D501A0/MSC/1 sem/Critical System/assigment/banking-auth-backend/docs"
pandoc COMPLETE_SYSTEM_DOCUMENTATION.md -o Banking_System_Documentation.pdf --pdf-engine=pdflatex -V geometry:margin=1in
```

## Option 2: Using Markdown to PDF Online

1. Visit: https://www.markdowntopdf.com/
2. Upload `COMPLETE_SYSTEM_DOCUMENTATION.md`
3. Download the PDF

## Option 3: Using VS Code Extension

1. Install "Markdown PDF" extension in VS Code
2. Open `COMPLETE_SYSTEM_DOCUMENTATION.md`
3. Right-click → "Markdown PDF: Export (pdf)"

## Option 4: Using Chrome/Edge

1. Install a Markdown viewer extension
2. Open the markdown file
3. Print to PDF (Ctrl+P → Save as PDF)

## Option 5: Using Online Tools

- **Dillinger**: https://dillinger.io/
- **StackEdit**: https://stackedit.io/
- **Markdown to PDF**: https://www.markdowntopdf.com/

## Quick Command (if Pandoc installed)

```bash
cd "/mnt/5042D51642D501A0/MSC/1 sem/Critical System/assigment/banking-auth-backend/docs"
pandoc COMPLETE_SYSTEM_DOCUMENTATION.md \
  -o Banking_Authentication_System_Documentation.pdf \
  --pdf-engine=pdflatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --highlight-style=tango
```

This will create a PDF with:
- Table of contents
- Proper margins
- Syntax highlighting
- Professional formatting


