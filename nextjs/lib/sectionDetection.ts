import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

export interface SectionRegion {
  key: string;
  yStart: number; // PDF coordinate (bottom-up)
  yEnd: number;
  page: number;
}

// Keyword → editor section key mapping (covers all 7 templates)
const SECTION_PATTERNS: [string, RegExp][] = [
  ["education", /\beducation\b/i],
  ["experiences", /\b(experience|work\s+experience|significant\s+roles|professional\s+experience)\b/i],
  ["skills", /\b(skills|technical\s+skills|skills\s*[&]\s*interests)\b/i],
  ["projects", /\b(projects?|selected\s+projects)\b/i],
  ["awards", /\b(awards?|honors|scholastic\s+achievements)\b/i],
  ["leadership", /\b(leadership|positions?\s+of\s+responsibility)\b/i],
  ["certifications", /\b(certifications?|global\s+certifications?)\b/i],
  ["languages", /\blanguages?\b/i],
  ["publications", /\b(publications?|academic\s+publications?)\b/i],
  ["summary", /\b(summary|personal\s+profile|objective)\b/i],
  ["coursework", /\b(coursework|key\s+courses)\b/i],
];

function isTextItem(item: TextContent["items"][number]): item is TextItem {
  return "str" in item && "transform" in item;
}

/**
 * Detect section header positions from pdf.js text content.
 * Returns vertical regions mapping to editor section keys.
 */
export function detectSections(
  textContent: TextContent,
  pageHeight: number,
  pageIndex: number
): SectionRegion[] {
  const headers: { key: string; y: number }[] = [];

  for (const item of textContent.items) {
    if (!isTextItem(item)) continue;
    const text = item.str.trim();
    if (!text || text.length > 60) continue; // Skip long paragraphs — not headers

    for (const [key, pattern] of SECTION_PATTERNS) {
      if (pattern.test(text)) {
        // PDF coordinates: transform[5] is Y from bottom
        const pdfY = item.transform[5];
        // Avoid duplicate detections for the same section
        if (!headers.some((h) => h.key === key && Math.abs(h.y - pdfY) < 20)) {
          headers.push({ key, y: pdfY });
        }
        break;
      }
    }
  }

  if (headers.length === 0) return [];

  // Sort by Y descending (top of page = highest Y in PDF coords)
  headers.sort((a, b) => b.y - a.y);

  const regions: SectionRegion[] = [];

  // Everything above the first section header → "person"
  regions.push({
    key: "person",
    yStart: pageHeight,
    yEnd: headers[0].y,
    page: pageIndex,
  });

  // Each header to the next
  for (let i = 0; i < headers.length; i++) {
    const yEnd = i + 1 < headers.length ? headers[i + 1].y : 0;
    regions.push({
      key: headers[i].key,
      yStart: headers[i].y,
      yEnd,
      page: pageIndex,
    });
  }

  return regions;
}

/**
 * Find which section a click at the given PDF Y coordinate belongs to.
 */
export function findSectionAtPosition(
  regions: SectionRegion[],
  pdfY: number,
  page: number
): string | null {
  for (const region of regions) {
    if (region.page !== page) continue;
    if (pdfY <= region.yStart && pdfY >= region.yEnd) {
      return region.key;
    }
  }
  return null;
}
