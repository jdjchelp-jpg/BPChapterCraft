import { OmnibusBookItem, OmnibusAssemblyOptions } from '../types';

function toRoman(num: number): string {
  const map: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let res = '';
  for (const [val, roman] of map) {
    while (num >= val) {
      res += roman;
      num -= val;
    }
  }
  return res || 'I';
}

/**
 * Merges multiple separate books into one unified Omnibus manuscript.
 * Demotes top-level `# Heading` inside individual books to `## Heading`
 * so the Volume/Book title becomes the master Level 1 parent heading.
 */
export function assembleOmnibusManuscript(
  books: OmnibusBookItem[],
  options: OmnibusAssemblyOptions
): { mergedText: string; totalWordCount: number } {
  if (!books || books.length === 0) {
    return { mergedText: '', totalWordCount: 0 };
  }

  const sections: string[] = [];

  books.forEach((book, idx) => {
    const bookNum = idx + 1;
    let volumeHeading = '';

    if (options.divisionStyle === 'book') {
      volumeHeading = `# Book ${bookNum}: ${book.title}`;
    } else if (options.divisionStyle === 'volume') {
      volumeHeading = `# Volume ${toRoman(bookNum)}: ${book.title}`;
    } else if (options.divisionStyle === 'part') {
      volumeHeading = `# Part ${bookNum}: ${book.title}`;
    } else {
      // Preserve custom volume prefix or exact title
      const prefix = book.volumePrefix ? `${book.volumePrefix}: ` : '';
      volumeHeading = `# ${prefix}${book.title}`;
    }

    // Demote any lone '# ' headings inside the book to '## ' so they nest under the Volume
    const adjustedContent = book.rawText
      .split('\n')
      .map((line) => {
        // If line starts with single '#' (e.g. # Chapter 1), convert to '## Chapter 1'
        if (/^#\s+[^#]/.test(line)) {
          return '#' + line;
        }
        return line;
      })
      .join('\n');

    const bookBlock: string[] = [];
    bookBlock.push(volumeHeading);

    if (options.includeBookTitlePages) {
      if (book.author) {
        bookBlock.push(`\n*By ${book.author}*\n`);
      }
      if (book.metadata?.synopsis) {
        bookBlock.push(`\n> ${book.metadata.synopsis}\n`);
      }
    }

    bookBlock.push('\n' + adjustedContent.trim() + '\n');
    sections.push(bookBlock.join('\n'));
  });

  const mergedText = sections.join('\n\n* * *\n\n');
  const totalWordCount = mergedText.trim().split(/\s+/).filter(Boolean).length;

  return { mergedText, totalWordCount };
}

/**
 * Creates sample 3-book trilogy for immediate testing and demonstration of the Omnibus feature
 */
export function getSampleTrilogy(): OmnibusBookItem[] {
  return [
    {
      id: 'sample-book-1',
      fileName: 'the_signet_pass.html',
      fileSize: 45000,
      fileType: 'HTML Document (.html)',
      title: 'The Signet of the North',
      author: 'Eleanor Vance',
      volumePrefix: 'Book 1',
      rawText: `## Chapter 1: The Mountain Gate

The winds blew cold from the jagged peaks of Valdor. Margaret adjusted her woolen cloak against the biting frost, gazing back one final time at the distant chimney smoke of Oakhaven.

Beside her, Bess urged her horse forward along the rocky ascent. In her saddlebag rested the bronze coffer containing the sovereign's unbroken seal.

## Chapter 2: The Frost Watch

Night fell swiftly across the high granite crags. The travelers sheltered beneath an overhang of ancient stone, nursing a small, hidden fire of dry pine branches.

"If the scouts hold the pass until daybreak," Bess whispered, testing the edge of her dagger, "we shall reach the eastern valley before the autumn snows shut the road."

## Chapter 3: The Broken Bridge

By dawn, the bridge of Aldermere lay shattered across the gorge. Two ropes swayed in the canyon breeze, whispering of saboteurs who had crossed only hours ahead.`,
      chapterCount: 3,
      wordCount: 1450,
      metadata: {
        title: 'The Signet of the North',
        author: 'Eleanor Vance',
        year: '2026',
        genre: 'Epic Fantasy',
        synopsis: 'Two messengers undertake a perilous crossing through the winter passes carrying the last seal of the realm.',
      },
    },
    {
      id: 'sample-book-2',
      fileName: 'the_shadow_citadel.html',
      fileSize: 52000,
      fileType: 'HTML Document (.html)',
      title: 'The Shadow Citadel',
      author: 'Eleanor Vance',
      volumePrefix: 'Book 2',
      rawText: `## Chapter 1: The Gates of Iron

Three days past the gorge, the towers of Kar-Thun rose like black obsidian needles against the gray sky. No banner flew from the parapets, yet smoke drifted from the armory chimney.

Margaret dismounted and approached the portcullis. A sentry's visor glinted behind the iron slats, neither raising a bow nor speaking a welcome.

## Chapter 2: The Hall of Echoes

Inside the citadel, footsteps resounded across acres of polished marble. The High Steward sat alone upon a carved oak dais, his hands resting flat upon parchment maps.

"You bring news of the northern frontier," the Steward said, rising with deliberate slowness. "Or do you bring the summons we have dreaded for thirty winters?"

## Chapter 3: The Council at Midnight

Torches guttered in the vaulted chambers as captains argued over battle lines. The signet was placed in the center of the mahogany table, casting long shadows across the painted borders of the kingdom.`,
      chapterCount: 3,
      wordCount: 1620,
      metadata: {
        title: 'The Shadow Citadel',
        author: 'Eleanor Vance',
        year: '2026',
        genre: 'Epic Fantasy',
        synopsis: 'At the fortress of Kar-Thun, ancient loyalties are tested as the northern war council convenes.',
      },
    },
    {
      id: 'sample-book-3',
      fileName: 'the_crown_of_valdor.html',
      fileSize: 48000,
      fileType: 'HTML Document (.html)',
      title: 'The Crown of Valdor',
      author: 'Eleanor Vance',
      volumePrefix: 'Book 3',
      rawText: `## Chapter 1: The Gathering Dawn

A horn sounded from the eastern watchtower. Across the river plains, thousands of campfires flickered like fallen constellations in the predawn mist.

Bess stood beside Margaret at the battlement rim. "Whatever happens when the sun crests the ridge, remember what was promised at the pass."

## Chapter 2: The River Crossing

Shields locked in a bronze wall as the vanguard pushed into the rushing shallows of the Silver River. Arrows fell like winter rain, hissing into the cold water.

Margaret drew her blade, leading the standard forward through the spray.

## Chapter 3: The High Throne Reclaimed

When the bells of Valdor rang out at dusk, they echoed from the mountains to the sea. The sealed letter had been delivered, the sovereign's throne restored, and the northern pass declared free forever.`,
      chapterCount: 3,
      wordCount: 1580,
      metadata: {
        title: 'The Crown of Valdor',
        author: 'Eleanor Vance',
        year: '2026',
        genre: 'Epic Fantasy',
        synopsis: 'The climactic battle for the high throne and the final fulfillment of the messengers oath.',
      },
    },
  ];
}
