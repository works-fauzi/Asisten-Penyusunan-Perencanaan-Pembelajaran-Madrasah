/**
 * Utility to convert markdown content into beautifully styled Word-compatible HTML
 * and trigger a download of a .doc file that opens flawlessly in MS Word.
 * Custom-crafted to exactly match the Times New Roman, black-and-white, professional
 * layout of Indonesian Madrasah Lesson Plans (Kemenag).
 */

import { LessonPlanParams } from "../types";

export function parseMarkdownToHTML(markdown: string): string {
  if (!markdown) return "";

  // Split content into lines to parse systematically
  const lines = markdown.split("\n");
  let html = "";
  
  let listDepth = 0; // 0 = no list, 1 = top level, 2 = nested level, etc.
  let listTypes: ("ul" | "ol")[] = []; // Track list tag types (ul or ol)
  
  let inTable = false;
  let tableHeaderParsed = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let line = rawLine.trim();

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
        html += "<table style='width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #000000;'>\n";
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
          ? "border: 1.5px solid #000000; padding: 6px; font-weight: bold; text-align: center; font-size: 10pt; color: #000000; background-color: #f2f2f2; font-family: 'Times New Roman', Times, serif;"
          : "border: 1.5px solid #000000; padding: 6px; text-align: left; font-size: 10pt; color: #000000; font-family: 'Times New Roman', Times, serif; vertical-align: top;";
        
        // Inline formatting for cells
        let cellText = cell;
        cellText = cellText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        cellText = cellText.replace(/\*(.*?)\*/g, "<i>$1</i>");
        
        html += `  <${tag} style="${style}">${cellText}</${tag}>\n`;
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
      html += `<div style="margin-left: 20px; padding-left: 10px; border-left: 2.5px solid #000000; font-style: italic; color: #000000; font-size: 11pt; font-family: 'Times New Roman', Times, serif; margin-top: 6px; margin-bottom: 6px; text-align: justify;">
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
          ? `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; list-style-type: ${listDepth === 1 ? 'disc' : listDepth === 2 ? 'circle' : 'square'};`
          : `margin-top: 4px; margin-bottom: 4px; padding-left: 20px;`;
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
          ? `margin-top: 4px; margin-bottom: 4px; padding-left: 20px; list-style-type: ${listDepth === 1 ? 'disc' : listDepth === 2 ? 'circle' : 'square'};`
          : `margin-top: 4px; margin-bottom: 4px; padding-left: 20px;`;
        html += `<${listType} style="${listStyle}">\n`;
      }

      let itemText = ulMatch ? ulMatch[3] : olMatch![3];
      itemText = itemText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      itemText = itemText.replace(/\*(.*?)\*/g, "<i>$1</i>");

      html += `  <li style="font-size: 11pt; line-height: 1.5; color: #000000; font-family: 'Times New Roman', Times, serif; margin-bottom: 3px; text-align: justify;">${itemText}</li>\n`;
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
      html += `<h3 style="color: #000000; font-size: 11pt; margin-top: 12px; margin-bottom: 4px; font-weight: bold; font-family: 'Times New Roman', Times, serif;">${text}</h3>\n`;
      continue;
    }
    if (line.startsWith("##")) {
      const text = line.replace(/^##\s*/, "");
      html += `<h2 style="color: #000000; font-size: 12pt; margin-top: 16px; margin-bottom: 6px; font-weight: bold; font-family: 'Times New Roman', Times, serif; text-transform: uppercase;">${text}</h2>\n`;
      continue;
    }
    if (line.startsWith("#")) {
      const text = line.replace(/^#\s*/, "");
      html += `<h1 style="color: #000000; font-size: 14pt; margin-top: 10px; margin-bottom: 15px; font-weight: bold; text-align: center; font-family: 'Times New Roman', Times, serif; text-transform: uppercase;">${text}</h1>\n`;
      continue;
    }

    // 5. Handle empty lines
    if (line === "") {
      html += "<p style='margin: 0; padding: 0; line-height: 1.0;'>&nbsp;</p>\n";
      continue;
    }

    // 6. Handle standard paragraph
    let paraText = line;
    paraText = paraText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    paraText = paraText.replace(/\*(.*?)\*/g, "<i>$1</i>");

    html += `<p style="font-size: 11pt; line-height: 1.5; color: #000000; margin-top: 4px; margin-bottom: 4px; text-align: justify; font-family: 'Times New Roman', Times, serif;">${paraText}</p>\n`;
  }

  // Close any unclosed tags at the end of content
  while (listDepth > 0) {
    const lastType = listTypes.pop();
    html += `</${lastType}>\n`;
    listDepth--;
  }
  if (inTable) html += "</table>\n";

  return html;
}

export function exportToWord(title: string, markdownContent: string, params?: LessonPlanParams) {
  const contentHTML = parseMarkdownToHTML(markdownContent);
  const cleanTitle = title.replace(/[^a-zA-Z0-9_\s-]/g, "").trim() || "Perencanaan_Pembelajaran";

  // Add standard signatures block at the bottom
  let signatureHTML = "";
  if (params) {
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
      <table style="width: 100%; border: none; border-collapse: collapse; margin-top: 45px; font-family: 'Times New Roman', Times, serif;">
        <tr style="border: none;">
          <td style="border: none; width: 50%; text-align: center; font-size: 11pt; font-family: 'Times New Roman', Times, serif; color: #000000; padding: 15px 0; vertical-align: top; line-height: 1.3;">
            Mengetahui,<br/>
            Kepala Madrasah<br/><br/><br/><br/><br/><br/>
            <b><u>M. Mafatihudin, M.Pd.</u></b>
          </td>
          <td style="border: none; width: 50%; text-align: center; font-size: 11pt; font-family: 'Times New Roman', Times, serif; color: #000000; padding: 15px 0; vertical-align: top; line-height: 1.3;">
            ${tempat}, ${bulanTahun}<br/>
            Guru Mata Pelajaran<br/><br/><br/><br/><br/><br/>
            <b><u>${namaGuru}</u></b>
          </td>
        </tr>
      </table>
    `;
  }

  // Build the complete MS Word-compatible HTML package matching the exact layout of MTs Al-Iman 02 Bulus
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
      <style>
        @page {
          size: 8.5in 11.0in; /* US Letter size */
          margin: 1.0in 1.0in 1.0in 1.0in; /* Standard 1 inch margins */
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
        }
        h1 {
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
          font-size: 14pt;
          text-align: center;
          margin-top: 0px;
          margin-bottom: 18px;
          font-weight: bold;
          text-transform: uppercase;
        }
        h2 {
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
          font-size: 12pt;
          margin-top: 18px;
          margin-bottom: 6px;
          font-weight: bold;
          text-transform: uppercase;
        }
        h3 {
          font-family: 'Times New Roman', Times, serif;
          color: #000000;
          font-size: 11pt;
          margin-top: 12px;
          margin-bottom: 4px;
          font-weight: bold;
        }
        p {
          font-family: 'Times New Roman', Times, serif;
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
        }
        th, td {
          border: 1.5px solid #000000;
          padding: 6px;
          font-size: 10pt;
          text-align: left;
          font-family: 'Times New Roman', Times, serif;
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
        }
        li {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          margin-bottom: 3px;
          text-align: justify;
          color: #000000;
        }
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
