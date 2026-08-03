/**
 * Utility to convert markdown content into beautifully styled Word-compatible HTML
 * and trigger a download of a .doc file that opens flawlessly in MS Word.
 * Custom-crafted to exactly match the Times New Roman, black-and-white, professional
 * layout of Indonesian Madrasah Lesson Plans (Kemenag).
 */

import { LessonPlanParams } from "../types";

export function cleanInputMarkdownAndExtractCSS(rawInput: string): { cleanedMarkdown: string; extraCSS: string } {
  if (!rawInput) return { cleanedMarkdown: "", extraCSS: "" };

  let input = rawInput;
  let extraCSS = "";

  // 1. Extract any <style ...> ... </style> blocks
  const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleBlockRegex.exec(input)) !== null) {
    let cssContent = match[1] || "";
    // Clean out all CSS comments /* ... */
    cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (cssContent) {
      extraCSS += "\n" + cssContent;
    }
  }
  // Remove all <style ...> ... </style> blocks from input completely
  input = input.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // 2. Remove DOCTYPE, html, head, body envelope tags
  input = input.replace(/<!DOCTYPE[^>]*>/gi, "");
  input = input.replace(/<\/?(html|head|body)[^>]*>/gi, "");

  // 3. Remove backticks / code fences wrapping html/css (```html, ```css, ```)
  input = input.replace(/^```(html|css|markdown)?$/gmi, "");

  // 4. Extract and remove orphan CSS rules or CSS comment lines that might be floating in plain text
  const lines = input.split("\n");
  const cleanLines: string[] = [];

  let inCssRuleBlock = false;
  let currentCssBlock = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip pure CSS comment lines
    if (/^\/\*[\s\S]*?\*\/\s*$/.test(trimmed) || (trimmed.startsWith("/*") && trimmed.endsWith("*/"))) {
      continue;
    }

    // Detect start of CSS rule block e.g. .header-table { or @page { or body {
    if (/^(@page|[\.#a-zA-Z0-9_,\s\-\*]+)\s*\{/i.test(trimmed) && !trimmed.startsWith("<") && !trimmed.startsWith("|") && !trimmed.startsWith("#") && !trimmed.startsWith("* ")) {
      inCssRuleBlock = true;
      currentCssBlock += trimmed + " ";
      if (trimmed.includes("}")) {
        inCssRuleBlock = false;
        const cleanedRule = currentCssBlock.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (cleanedRule) extraCSS += "\n" + cleanedRule;
        currentCssBlock = "";
      }
      continue;
    }

    if (inCssRuleBlock) {
      currentCssBlock += trimmed + " ";
      if (trimmed.includes("}")) {
        inCssRuleBlock = false;
        const cleanedRule = currentCssBlock.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (cleanedRule) extraCSS += "\n" + cleanedRule;
        currentCssBlock = "";
      }
      continue;
    }

    // Detect lone CSS property declarations like font-family: 'Times New Roman'...; or width: 100%;
    if (/^[a-zA-Z\-]+\s*:\s*[^;{}]+;?\s*$/.test(trimmed) && !trimmed.includes("<") && !trimmed.startsWith("- ") && !trimmed.startsWith("* ") && !trimmed.startsWith("1.") && !trimmed.startsWith("2.")) {
      continue;
    }

    cleanLines.push(line);
  }

  return {
    cleanedMarkdown: cleanLines.join("\n"),
    extraCSS: extraCSS.trim()
  };
}

export function parseMarkdownToHTML(markdown: string): string {
  if (!markdown) return "";

  const { cleanedMarkdown } = cleanInputMarkdownAndExtractCSS(markdown);

  // Split content into lines to parse systematically
  const lines = cleanedMarkdown.split("\n");
  let html = "";
  
  let listDepth = 0; // 0 = no list, 1 = top level, 2 = nested level, etc.
  let listTypes: ("ul" | "ol")[] = []; // Track list tag types (ul or ol)
  
  let inTable = false;
  let tableHeaderParsed = false;
  let inCodeBlock = false;
  let inSvg = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = rawLine.trim();

    // Handle code fence backticks e.g., ```html or ```
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Replace SVG or images with clean MSO dashed placeholder box
    if (line.toLowerCase().includes("<svg") || inSvg) {
      if (line.toLowerCase().includes("<svg")) inSvg = true;
      if (line.toLowerCase().includes("</svg>")) {
        inSvg = false;
        html += `<div style="border: 1.5px dashed #000000; padding: 10px; background-color: #fafafa; margin: 10px 0; text-align: center; font-family: 'Times New Roman', Times, serif !important;"><b>[BINGKAI ILUSTRASI MEDIA PEMBELAJARAN]</b><br/><i style="font-size: 10pt; color: #333333;">AI Image Prompt (English):</i> "Black and white line art, clean outlines, simple coloring page style, no color, no shading, plain white background, minimalist vector illustration for school worksheet, featuring educational scene"</div>\n`;
      }
      continue;
    }

    // 1. Handle Tables
    if (line.startsWith("|")) {
      // Close any open lists before starting a table
      while (listDepth > 0) {
        const lastType = listTypes.pop();
        html += `</${lastType}>\n`;
        listDepth--;
      }

      if (!inTable) {
        inTable = true;
        tableHeaderParsed = false;
        html += "<table class='dark:border-slate-600' style='width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #000000; font-family: \"Times New Roman\", Times, serif !important;'>\n";
      }

      // Check if it is a separator line e.g., |---|---|
      if (line.replace(/[^|]/g, "").length > 1 && line.replace(/[|\s-]/g, "").length === 0) {
        // This is a header divider, skip rendering it
        continue;
      }

      // Parse cells
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      html += "<tr>\n";
      for (const cell of cells) {
        const isHeader = !tableHeaderParsed;
        const tag = isHeader ? "th" : "td";
        const style = isHeader
          ? "border: 1.5px solid #000000; padding: 6px; font-weight: bold; text-align: center; font-size: 10pt; color: #000000; background-color: #f2f2f2; font-family: 'Times New Roman', Times, serif !important;"
          : "border: 1.5px solid #000000; padding: 6px; text-align: left; font-size: 10pt; color: #000000; font-family: 'Times New Roman', Times, serif !important; vertical-align: top;";
        
        // Inline formatting for cells
        let cellText = cell;
        cellText = cellText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        cellText = cellText.replace(/\*(.*?)\*/g, "<i>$1</i>");
        
        html += `  <${tag} class="${isHeader ? 'dark:text-white dark:bg-slate-800/80 dark:border-slate-600' : 'dark:text-slate-300 dark:border-slate-600'}" style="${style}">${cellText}</${tag}>\n`;
      }
      html += "</tr>\n";
      
      if (!tableHeaderParsed) {
        tableHeaderParsed = true;
      }
      continue;
    } else {
      if (inTable) {
        html += "</table>\n";
        inTable = false;
      }
    }

    // 2. Handle Blockquotes (Ucap Guru / Dialog)
    if (line.startsWith(">")) {
      // Close any open lists
      while (listDepth > 0) {
        const lastType = listTypes.pop();
        html += `</${lastType}>\n`;
        listDepth--;
      }

      const quoteContent = line.replace(/^>\s*/, "").trim();
      let formattedQuote = quoteContent;
      // Inline formatting
      formattedQuote = formattedQuote.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      formattedQuote = formattedQuote.replace(/\*(.*?)\*/g, "<i>$1</i>");

      // Professional italicized left-bordered indent without colored box
      html += `<div class="dark:text-slate-200 dark:border-sky-400" style="margin-left: 20px; padding-left: 10px; border-left: 2.5px solid #000000; font-style: italic; color: #000000; font-size: 11pt; font-family: 'Times New Roman', Times, serif !important; margin-top: 6px; margin-bottom: 6px; text-align: justify;">
        ${formattedQuote}
      </div>\n`;
      continue;
    }

    // 3. Handle Lists (Unordered & Ordered with Indentation)
    const ulMatch = rawLine.match(/^(\s*)([\*\-•●○■])\s+(.*)/);
    const olMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)/);

    if (ulMatch || olMatch) {
      const indent = ulMatch ? ulMatch[1].length : olMatch![1].length;
      // Map indent spaces to logical depth (0-1 space = depth 1, 2-3 spaces = depth 2, 4+ spaces = depth 3)
      const targetDepth = indent === 0 ? 1 : (indent <= 3 ? 2 : 3);
      const isOl = !!olMatch;
      const listType = isOl ? "ol" : "ul";

      // Open nested lists
      while (listDepth < targetDepth) {
        listDepth++;
        listTypes.push(listType);
        const listStyle = listType === "ul"
          ? `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; font-family: 'Times New Roman', Times, serif !important; list-style-type: ${listDepth === 1 ? 'disc' : listDepth === 2 ? 'circle' : 'square'};`
          : `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; font-family: 'Times New Roman', Times, serif !important;`;
        html += `<${listType} style="${listStyle}">\n`;
      }

      // Close deeper nested lists
      while (listDepth > targetDepth) {
        const lastType = listTypes.pop();
        html += `</${lastType}>\n`;
        listDepth--;
      }

      // Swap list type if mismatch at current level
      if (listDepth > 0 && listTypes[listDepth - 1] !== listType) {
        const lastType = listTypes[listDepth - 1];
        html += `</${lastType}>\n`;
        listTypes[listDepth - 1] = listType;
        const listStyle = listType === "ul"
          ? `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; font-family: 'Times New Roman', Times, serif !important; list-style-type: ${listDepth === 1 ? 'disc' : listDepth === 2 ? 'circle' : 'square'};`
          : `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; font-family: 'Times New Roman', Times, serif !important;`;
        html += `<${listType} style="${listStyle}">\n`;
      }

      let itemText = ulMatch ? ulMatch[3] : olMatch![3];
      itemText = itemText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      itemText = itemText.replace(/\*(.*?)\*/g, "<i>$1</i>");

      html += `  <li class="dark:text-slate-200" style="font-size: 11pt; line-height: 1.5; color: #000000; font-family: 'Times New Roman', Times, serif !important; margin-bottom: 3px; text-align: justify;">${itemText}</li>\n`;
      continue;
    } else {
      // Close all lists if we hit a non-list item
      while (listDepth > 0) {
        const lastType = listTypes.pop();
        html += `</${lastType}>\n`;
        listDepth--;
      }
    }

    // 4. Handle Headers
    if (line.startsWith("###")) {
      const text = line.replace(/^###\s*/, "");
      html += `<h3 class="dark:text-white" style="color: #000000; font-size: 11pt; margin-top: 12px; margin-bottom: 4px; font-weight: bold; font-family: 'Times New Roman', Times, serif !important;">${text}</h3>\n`;
      continue;
    }
    if (line.startsWith("##")) {
      const text = line.replace(/^##\s*/, "");
      html += `<h2 class="dark:text-white" style="color: #000000; font-size: 12pt; margin-top: 16px; margin-bottom: 6px; font-weight: bold; font-family: 'Times New Roman', Times, serif !important; text-transform: uppercase;">${text}</h2>\n`;
      continue;
    }
    if (line.startsWith("#")) {
      const text = line.replace(/^#\s*/, "");
      html += `<h1 class="header-title dark:text-white" style="color: #000000; font-size: 14pt; margin-top: 15px; margin-bottom: 15px; padding: 0; font-weight: bold; text-align: center; font-family: 'Times New Roman', Times, serif !important; text-transform: uppercase;">${text}</h1>\n`;
      continue;
    }

    // 5. Handle empty lines
    if (line === "") {
      html += "<p style='margin: 0; padding: 0; line-height: 1.0;'>&nbsp;</p>\n";
      continue;
    }

    // 6. Handle student answer write-line placeholders e.g., _____ or ........
    if (/^[_\.\-]{10,}$/.test(line)) {
      html += `<div class="write-line" style="border-bottom: 1.5px dotted #000000; min-height: 22px; width: 100%; margin: 8px 0; font-family: 'Times New Roman', Times, serif !important; display: block;">....................................................................................................</div>\n`;
      continue;
    }

    // 7. Handle standard paragraph or raw block HTML
    let paraText = line;
    paraText = paraText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    paraText = paraText.replace(/\*(.*?)\*/g, "<i>$1</i>");

    // Do not wrap block HTML elements (div, table, p, h1-h6, ul, ol, li) inside a <p> tag
    const isBlockElement = /^<(?:\/)?(div|table|tr|td|th|p|h[1-6]|ul|ol|li|blockquote|header|footer)/i.test(line);
    if (isBlockElement) {
      html += paraText + "\n";
    } else {
      html += `<p class="dark:text-slate-200" style="font-size: 11pt; line-height: 1.5; color: #000000; margin-top: 4px; margin-bottom: 4px; text-align: justify; font-family: 'Times New Roman', Times, serif !important;">${paraText}</p>\n`;
    }
  }

  // Close any unclosed tags at the end of content
  while (listDepth > 0) {
    const lastType = listTypes.pop();
    html += `</${lastType}>\n`;
    listDepth--;
  }
  if (inTable) html += "</table>\n";

  // Strip empty paragraph gaps or <br> before titles or at document top
  html = html.replace(/^(?:\s*<(?:p|div)[^>]*>(?:&nbsp;|\s)*<\/(?:p|div)>\s*|<br\s*\/?>\s*)+/gi, "");
  html = html.replace(/(?:<(?:p|div)[^>]*>(?:&nbsp;|\s)*<\/(?:p|div)>\s*|<br\s*\/?>\s*)+(?=<h1|\.header-title|<div class="header-table"|<table class="header-table")/gi, "");

  return html;
}

export function exportToWord(title: string, markdownContent: string, params?: LessonPlanParams, docType?: string) {
  const { cleanedMarkdown, extraCSS } = cleanInputMarkdownAndExtractCSS(markdownContent);
  let contentHTML = parseMarkdownToHTML(cleanedMarkdown);

  // Convert or clean inline <svg> elements into clean MSO dashed placeholder boxes to avoid broken red X image icons in MS Word
  contentHTML = contentHTML.replace(/<svg[\s\S]*?<\/svg>/gi, () => {
    return `
    <div style="border: 1.5px dashed #000000; padding: 10px; background-color: #fafafa; margin: 10px 0; text-align: center; font-family: 'Times New Roman', Times, serif !important;">
      <b>[BINGKAI ILUSTRASI MEDIA PEMBELAJARAN]</b><br/>
      <i style="font-size: 10pt; color: #333333;">AI Image Prompt (English):</i> "Black and white line art, clean outlines, simple coloring page style, no color, no shading, plain white background, minimalist vector illustration for school worksheet, featuring educational scene"
    </div>`;
  });

  // Strip empty paragraphs or <br> before headers or at document top
  contentHTML = contentHTML.replace(/^(?:\s*<(?:p|div)[^>]*>(?:&nbsp;|\s)*<\/(?:p|div)>\s*|<br\s*\/?>\s*)+/gi, "");
  contentHTML = contentHTML.replace(/(?:<(?:p|div)[^>]*>(?:&nbsp;|\s)*<\/(?:p|div)>\s*|<br\s*\/?>\s*)+(?=<h1|\.header-title|<div class="header-table"|<table class="header-table")/gi, "");

  const cleanTitle = title.replace(/[^a-zA-Z0-9_\s-]/g, "").trim() || "Dokumen_Modul";

  // Check if this is an LKPD document
  const isLKPD = docType === 'lkpd' || 
                 title.toUpperCase().startsWith('LKPD') || 
                 title.toUpperCase().includes('LKPD');

  // Add standard signatures block ONLY if it's NOT an LKPD
  let signatureHTML = "";
  if (params && !isLKPD) {
    const namaGuru = params.namaGuru || "Achmad Fauzi, S.S.";
    const madrasah = params.madrasah || "MTs Al-Iman 02 Bulus";
    
    let tempat = "Purworejo";
    if (madrasah.toLowerCase().includes("bulus") || madrasah.toLowerCase().includes("purworejo")) {
      tempat = "Purworejo";
    }
    
    const now = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const bulanTahun = `${months[now.getMonth()]} ${now.getFullYear()}`;

    signatureHTML = `
      <table style="width: 100%; border: none; border-collapse: collapse; margin-top: 45px; font-family: 'Times New Roman', Times, serif !important;">
        <tr style="border: none;">
          <td style="border: none; width: 50%; text-align: center; font-size: 11pt; font-family: 'Times New Roman', Times, serif !important; color: #000000; padding: 15px 0; vertical-align: top; line-height: 1.3;">
            Mengetahui,<br/>
            Kepala Madrasah<br/><br/><br/><br/><br/><br/>
            <b><u>M. Mafatihudin, M.Pd.</u></b>
          </td>
          <td style="border: none; width: 50%; text-align: center; font-size: 11pt; font-family: 'Times New Roman', Times, serif !important; color: #000000; padding: 15px 0; vertical-align: top; line-height: 1.3;">
            ${tempat}, ${bulanTahun}<br/>
            Guru Mata Pelajaran<br/><br/><br/><br/><br/><br/>
            <b><u>${namaGuru}</u></b>
          </td>
        </tr>
      </table>
    `;
  }

  // Clean extra CSS from any comments
  const cleanExtraCSS = extraCSS.replace(/\/\*[\s\S]*?\*\//g, "").trim();

  // Build the complete MS Word-compatible HTML package matching the exact layout of MTs Al-Iman 02 Bulus
  // NOTE: ABSOLUTELY NO CSS COMMENTS inside <style> to prevent raw text leak in Word!
  const wordHTML = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style type="text/css">
        @page {
          size: A4;
          margin: 1.0in 1.0in 1.0in 1.0in;
        }
        html, body, table, td, th, p, div, span, h1, h2, h3, h4, h5, h6, li, ul, ol {
          font-family: 'Times New Roman', Times, serif !important;
        }
        body {
          font-family: 'Times New Roman', Times, serif !important;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          border: none !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        .header-table td, .header-table th {
          border: none !important;
          padding: 4px;
          font-family: 'Times New Roman', Times, serif !important;
        }
        .instruction-box {
          border: 1.5px solid #000000;
          padding: 10px;
          margin: 10px 0;
          background-color: #fafafa;
          font-family: 'Times New Roman', Times, serif !important;
        }
        .illustration-box {
          border: 1.5px dashed #000000;
          padding: 10px;
          background-color: #fafafa;
          margin: 10px 0;
          text-align: center;
          font-family: 'Times New Roman', Times, serif !important;
        }
        .write-line {
          border-bottom: 1.5px dotted #000000;
          min-height: 22px;
          width: 100%;
          margin: 8px 0;
          font-family: 'Times New Roman', Times, serif !important;
          display: block;
        }
        h1, .header-title {
          font-family: 'Times New Roman', Times, serif !important;
          color: #000000;
          font-size: 14pt;
          text-align: center;
          margin-top: 15px;
          margin-bottom: 15px;
          padding: 0;
          font-weight: bold;
          text-transform: uppercase;
        }
        h2 {
          font-family: 'Times New Roman', Times, serif !important;
          color: #000000;
          font-size: 12pt;
          margin-top: 18px;
          margin-bottom: 6px;
          font-weight: bold;
          text-transform: uppercase;
        }
        h3 {
          font-family: 'Times New Roman', Times, serif !important;
          color: #000000;
          font-size: 11pt;
          margin-top: 12px;
          margin-bottom: 4px;
          font-weight: bold;
        }
        p {
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 11pt;
          margin-top: 4px;
          margin-bottom: 4px;
          text-align: justify;
          color: #000000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-family: 'Times New Roman', Times, serif !important;
        }
        th, td {
          border: 1.5px solid #000000;
          padding: 6px;
          font-size: 10pt;
          text-align: left;
          font-family: 'Times New Roman', Times, serif !important;
          color: #000000;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
        }
        ul, ol {
          margin-top: 4px;
          margin-bottom: 4px;
          padding-left: 20px;
          font-family: 'Times New Roman', Times, serif !important;
        }
        li {
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 11pt;
          margin-bottom: 3px;
          text-align: justify;
          color: #000000;
        }
        div, span {
          font-family: 'Times New Roman', Times, serif !important;
        }
        ${cleanExtraCSS}
      </style>
    </head>
    <body>
      
      ${contentHTML}
      
      ${signatureHTML}

    </body>
    </html>
  `;

  // Create a Blob from the generated HTML with the correct MS Word content type
  const blob = new Blob(['\ufeff' + wordHTML], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanTitle.replace(/\s+/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyFormattedHTMLToClipboard(markdown: string): Promise<boolean> {
  if (!markdown) return false;
  const htmlContent = parseMarkdownToHTML(markdown);
  const styledHTML = `<div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000000; line-height: 1.5;">${htmlContent}</div>`;

  try {
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      const htmlBlob = new Blob([styledHTML], { type: "text/html" });
      const textBlob = new Blob([markdown], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch (err) {
    console.warn("ClipboardItem write failed, fallback to plain text:", err);
    await navigator.clipboard.writeText(markdown);
    return true;
  }
}
