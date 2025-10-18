/**
 * Adapted from streamdown's `parse-incomplete-markdown.ts`
 * Source: https://github.com/vercel/streamdown/blob/main/packages/streamdown/lib/parse-incomplete-markdown.ts
 *
 * Copyright 2023 Vercel, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Modifications: trimmed for React Native usage and simplified placeholder handling.
 */
const linkImagePattern = /(!?\[)([^\]]*?)$/;
const boldPattern = /(\*\*)([^*]*?)$/;
const italicPattern = /(__)([^_]*?)$/;
const boldItalicPattern = /(\*\*\*)([^*]*?)$/;
const singleAsteriskPattern = /(\*)([^*]*?)$/;
const singleUnderscorePattern = /(_)([^_]*?)$/;
const inlineCodePattern = /(`)([^`]*?)$/;
const strikethroughPattern = /(~~)([^~]*?)$/;

export const INCOMPLETE_LINK_PLACEHOLDER = 'streamdown:incomplete-link';

function hasCompleteCodeBlock(text: string): boolean {
  const tripleBackticks = (text.match(/```/g) || []).length;
  return (
    tripleBackticks > 0 && tripleBackticks % 2 === 0 && text.includes('\n')
  );
}

function handleIncompleteLinksAndImages(text: string): string {
  const incompleteLinkUrlPattern = /(!?)\[([^\]]+)\]\(([^)]+)$/;
  const incompleteLinkUrlMatch = text.match(incompleteLinkUrlPattern);

  if (incompleteLinkUrlMatch) {
    const [, marker = '', linkText = '', partialUrl = ''] =
      incompleteLinkUrlMatch;
    const isImage = marker === '!';
    const matchStart = text.lastIndexOf(
      `${isImage ? '!' : ''}[${linkText}](${partialUrl}`
    );
    const beforeLink = text.substring(0, matchStart);

    if (isImage) {
      return `${beforeLink}${linkText}`;
    }

    return `${beforeLink}[${linkText}](${INCOMPLETE_LINK_PLACEHOLDER})`;
  }

  const linkMatch = text.match(linkImagePattern);

  if (linkMatch) {
    const [, marker = '', trailing = ''] = linkMatch;
    const isImage = marker.startsWith('!');
    if (isImage) {
      const startIndex = text.lastIndexOf(marker);
      const beforeMarker = text.substring(0, startIndex);
      return `${beforeMarker}${trailing}`;
    }

    return `${text}](${INCOMPLETE_LINK_PLACEHOLDER})`;
  }

  return text;
}

function handleIncompleteBold(text: string): string {
  if (hasCompleteCodeBlock(text)) {
    return text;
  }

  const boldMatch = text.match(boldPattern);

  if (boldMatch) {
    const [, marker = '', contentAfterMarker = ''] = boldMatch;
    if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
      return text;
    }

    const markerIndex = text.lastIndexOf(marker);
    const beforeMarker = text.substring(0, markerIndex);
    const lastNewlineBeforeMarker = beforeMarker.lastIndexOf('\n');
    const lineStart =
      lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
    const lineBeforeMarker = text.substring(lineStart, markerIndex);

    if (/^[\s]*[-*+][\s]+$/.test(lineBeforeMarker)) {
      if (contentAfterMarker.includes('\n')) {
        return text;
      }
    }

    const asteriskPairs = (text.match(/\*\*/g) || []).length;
    if (asteriskPairs % 2 === 1) {
      return `${text}**`;
    }
  }

  return text;
}

function handleIncompleteDoubleUnderscoreItalic(text: string): string {
  const italicMatch = text.match(italicPattern);

  if (italicMatch) {
    const [, marker = '', contentAfterMarker = ''] = italicMatch;
    if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
      return text;
    }

    const markerIndex = text.lastIndexOf(marker);
    const beforeMarker = text.substring(0, markerIndex);
    const lastNewlineBeforeMarker = beforeMarker.lastIndexOf('\n');
    const lineStart =
      lastNewlineBeforeMarker === -1 ? 0 : lastNewlineBeforeMarker + 1;
    const lineBeforeMarker = text.substring(lineStart, markerIndex);

    if (/^[\s]*[-*+][\s]+$/.test(lineBeforeMarker)) {
      if (contentAfterMarker.includes('\n')) {
        return text;
      }
    }

    const underscorePairs = (text.match(/__/g) || []).length;
    if (underscorePairs % 2 === 1) {
      return `${text}__`;
    }
  }

  return text;
}

function countSingleAsterisks(text: string): number {
  return text.split('').reduce((acc, char, index) => {
    if (char === '*') {
      const prevChar = text[index - 1];
      const nextChar = text[index + 1];
      if (prevChar === '\\') {
        return acc;
      }

      let lineStartIndex = index;
      for (let i = index - 1; i >= 0; i -= 1) {
        if (text[i] === '\n') {
          lineStartIndex = i + 1;
          break;
        }
        if (i === 0) {
          lineStartIndex = 0;
          break;
        }
      }

      const beforeAsterisk = text.substring(lineStartIndex, index);
      if (
        beforeAsterisk.trim() === '' &&
        (nextChar === ' ' || nextChar === '\t')
      ) {
        return acc;
      }

      if (prevChar !== '*' && nextChar !== '*') {
        return acc + 1;
      }
    }
    return acc;
  }, 0);
}

function handleIncompleteSingleAsteriskItalic(text: string): string {
  if (hasCompleteCodeBlock(text)) {
    return text;
  }

  const singleAsteriskMatch = text.match(singleAsteriskPattern);

  if (singleAsteriskMatch) {
    let firstSingleAsteriskIndex = -1;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') {
        firstSingleAsteriskIndex = i;
        break;
      }
    }

    if (firstSingleAsteriskIndex === -1) {
      return text;
    }

    const contentAfterFirstAsterisk = text.substring(
      firstSingleAsteriskIndex + 1
    );

    if (
      !contentAfterFirstAsterisk ||
      /^[\s_~*`]*$/.test(contentAfterFirstAsterisk)
    ) {
      return text;
    }

    const singleAsterisks = countSingleAsterisks(text);
    if (singleAsterisks % 2 === 1) {
      return `${text}*`;
    }
  }

  return text;
}

function isWithinMathBlock(text: string, position: number): boolean {
  let inInlineMath = false;
  let inBlockMath = false;

  for (let i = 0; i < text.length && i < position; i += 1) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      i += 1;
      continue;
    }

    if (text[i] === '$') {
      if (text[i + 1] === '$') {
        inBlockMath = !inBlockMath;
        i += 1;
        inInlineMath = false;
      } else if (!inBlockMath) {
        inInlineMath = !inInlineMath;
      }
    }
  }

  return inInlineMath || inBlockMath;
}

function countSingleUnderscores(text: string): number {
  return text.split('').reduce((acc, char, index) => {
    if (char === '_') {
      const prevChar = text[index - 1];
      const nextChar = text[index + 1];
      if (prevChar === '\\') {
        return acc;
      }
      if (isWithinMathBlock(text, index)) {
        return acc;
      }
      if (
        prevChar &&
        nextChar &&
        /[\p{L}\p{N}_]/u.test(prevChar) &&
        /[\p{L}\p{N}_]/u.test(nextChar)
      ) {
        return acc;
      }
      if (prevChar !== '_' && nextChar !== '_') {
        return acc + 1;
      }
    }
    return acc;
  }, 0);
}

function handleIncompleteSingleUnderscoreItalic(text: string): string {
  if (hasCompleteCodeBlock(text)) {
    return text;
  }

  const singleUnderscoreMatch = text.match(singleUnderscorePattern);

  if (singleUnderscoreMatch) {
    let firstSingleUnderscoreIndex = -1;
    for (let i = 0; i < text.length; i += 1) {
      if (
        text[i] === '_' &&
        text[i - 1] !== '_' &&
        text[i + 1] !== '_' &&
        text[i - 1] !== '\\' &&
        !isWithinMathBlock(text, i)
      ) {
        const prevChar = i > 0 ? text[i - 1] : '';
        const nextChar = i < text.length - 1 ? text[i + 1] : '';
        if (
          prevChar &&
          nextChar &&
          /[\p{L}\p{N}_]/u.test(prevChar) &&
          /[\p{L}\p{N}_]/u.test(nextChar)
        ) {
          continue;
        }

        firstSingleUnderscoreIndex = i;
        break;
      }
    }

    if (firstSingleUnderscoreIndex === -1) {
      return text;
    }

    const contentAfterFirstUnderscore = text.substring(
      firstSingleUnderscoreIndex + 1
    );

    if (
      !contentAfterFirstUnderscore ||
      /^[\s_~*`]*$/.test(contentAfterFirstUnderscore)
    ) {
      return text;
    }

    const singleUnderscores = countSingleUnderscores(text);
    if (singleUnderscores % 2 === 1) {
      const trailingNewlineMatch = text.match(/\n+$/);
      if (trailingNewlineMatch) {
        const textBeforeNewlines = text.slice(
          0,
          -trailingNewlineMatch[0].length
        );
        return `${textBeforeNewlines}_${trailingNewlineMatch[0]}`;
      }
      return `${text}_`;
    }
  }

  return text;
}

function isPartOfTripleBacktick(text: string, index: number): boolean {
  const isTripleStart = text.substring(index, index + 3) === '```';
  const isTripleMiddle =
    index > 0 && text.substring(index - 1, index + 2) === '```';
  const isTripleEnd =
    index > 1 && text.substring(index - 2, index + 1) === '```';

  return isTripleStart || isTripleMiddle || isTripleEnd;
}

function countSingleBackticks(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '`' && !isPartOfTripleBacktick(text, i)) {
      count += 1;
    }
  }
  return count;
}

function handleIncompleteInlineCode(text: string): string {
  const inlineTripleBacktickMatch = text.match(/^```[^`\n]*```?$/);
  if (inlineTripleBacktickMatch && !text.includes('\n')) {
    if (text.endsWith('``') && !text.endsWith('```')) {
      return `${text}\``;
    }
    return text;
  }

  const allTripleBackticks = (text.match(/```/g) || []).length;
  const insideIncompleteCodeBlock = allTripleBackticks % 2 === 1;

  if (
    allTripleBackticks > 0 &&
    allTripleBackticks % 2 === 0 &&
    text.includes('\n')
  ) {
    return text;
  }

  if (text.endsWith('```\n') || text.endsWith('```')) {
    if (allTripleBackticks % 2 === 0) {
      return text;
    }
  }

  const inlineCodeMatch = text.match(inlineCodePattern);

  if (inlineCodeMatch && !insideIncompleteCodeBlock) {
    const contentAfterMarker = inlineCodeMatch[2];
    if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
      return text;
    }

    const singleBacktickCount = countSingleBackticks(text);
    if (singleBacktickCount % 2 === 1) {
      return `${text}\``;
    }
  }

  return text;
}

function handleIncompleteStrikethrough(text: string): string {
  const strikethroughMatch = text.match(strikethroughPattern);

  if (strikethroughMatch) {
    const contentAfterMarker = strikethroughMatch[2];
    if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
      return text;
    }

    const tildePairs = (text.match(/~~/g) || []).length;
    if (tildePairs % 2 === 1) {
      return `${text}~~`;
    }
  }

  return text;
}

function handleIncompleteBlockKatex(text: string): string {
  const dollarPairs = (text.match(/\$\$/g) || []).length;

  if (dollarPairs % 2 === 0) {
    return text;
  }

  const firstDollarIndex = text.indexOf('$$');
  const hasNewlineAfterStart =
    firstDollarIndex !== -1 && text.indexOf('\n', firstDollarIndex) !== -1;

  if (hasNewlineAfterStart && !text.endsWith('\n')) {
    return `${text}\n$$`;
  }

  return `${text}$$`;
}

function countTripleAsterisks(text: string): number {
  let count = 0;
  const matches = text.match(/\*+/g) || [];

  for (const match of matches) {
    const asteriskCount = match.length;
    if (asteriskCount >= 3) {
      count += Math.floor(asteriskCount / 3);
    }
  }

  return count;
}

function handleIncompleteBoldItalic(text: string): string {
  if (hasCompleteCodeBlock(text)) {
    return text;
  }

  if (/^\*{4,}$/.test(text)) {
    return text;
  }

  const boldItalicMatch = text.match(boldItalicPattern);

  if (boldItalicMatch) {
    const contentAfterMarker = boldItalicMatch[2];
    if (!contentAfterMarker || /^[\s_~*`]*$/.test(contentAfterMarker)) {
      return text;
    }

    const tripleAsteriskCount = countTripleAsterisks(text);
    if (tripleAsteriskCount % 2 === 1) {
      return `${text}***`;
    }
  }

  return text;
}

export function sanitizeIncompleteMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = handleIncompleteLinksAndImages(text);

  if (result.endsWith(`](${INCOMPLETE_LINK_PLACEHOLDER})`)) {
    return result;
  }

  result = handleIncompleteBoldItalic(result);
  result = handleIncompleteBold(result);
  result = handleIncompleteDoubleUnderscoreItalic(result);
  result = handleIncompleteSingleAsteriskItalic(result);
  result = handleIncompleteSingleUnderscoreItalic(result);
  result = handleIncompleteInlineCode(result);
  result = handleIncompleteStrikethrough(result);
  result = handleIncompleteBlockKatex(result);

  return result;
}
