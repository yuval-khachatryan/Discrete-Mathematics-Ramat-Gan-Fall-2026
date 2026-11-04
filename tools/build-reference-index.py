#!/usr/bin/env python3
"""Index rendered reference boxes as a script, usable on Pages and file://."""
import json
import os
from html.parser import HTMLParser
from pathlib import Path


class Boxes(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.stack = []
        self.boxes = {}

    def position_offset(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        if tag == 'div':
            attrs = dict(attrs)
            classes = set(attrs.get('class', '').split())
            key = attrs.get('id') if classes & {'thmbox', 'equivalence-law'} else None
            self.stack.append((self.position_offset(), key))

    def handle_endtag(self, tag):
        if tag == 'div' and self.stack:
            start, key = self.stack.pop()
            if key:
                end = self.source.index('>', self.position_offset()) + 1
                self.boxes[key] = self.source[start:end]


output = Path(os.environ.get('QUARTO_PROJECT_OUTPUT_DIR', '_book'))
index = {}
for page in sorted(output.glob('*.html')):
    parser = Boxes(page.read_text())
    parser.feed(parser.source)
    index[page.name] = parser.boxes
data = json.dumps(index, ensure_ascii=False).replace('<', '\\u003c')
(output / 'reference-index.js').write_text('window.BOOK_REFERENCE_INDEX = ' + data + ';\n')
print(f'Reference index: {sum(map(len, index.values()))} boxes.')
