#!/usr/bin/env python3
"""
Extract glyph2tile mapping from NetHack's tile.c and convert to JSON.

Usage:
    python extract_glyph2tile.py src/tile.c > webhack-client/public/tilesets/glyph2tile_default.json
"""

import re
import json
import sys


def extract_glyph2tile(tile_c_path):
    """Extract the glyph2tile array from tile.c file."""
    try:
        with open(tile_c_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {tile_c_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Find the glyph2tile array definition
    # Pattern: short glyph2tile[MAX_GLYPH] = { ... };
    match = re.search(
        r'short\s+glyph2tile\s*\[\s*MAX_GLYPH\s*\]\s*=\s*\{([^}]+)\}',
        content,
        re.DOTALL
    )
    
    if not match:
        print("Error: Could not find glyph2tile array in file", file=sys.stderr)
        print("Expected pattern: short glyph2tile[MAX_GLYPH] = { ... }", file=sys.stderr)
        sys.exit(1)
    
    # Extract the numbers from the array
    numbers_str = match.group(1)
    
    # Remove comments (// ... and /* ... */)
    numbers_str = re.sub(r'//.*?$', '', numbers_str, flags=re.MULTILINE)
    numbers_str = re.sub(r'/\*.*?\*/', '', numbers_str, flags=re.DOTALL)
    
    # Extract all numbers (handles multi-line, whitespace, etc.)
    numbers = []
    for num_str in numbers_str.split(','):
        num_str = num_str.strip()
        if num_str:
            try:
                numbers.append(int(num_str))
            except ValueError:
                print(f"Warning: Skipping invalid number: {num_str}", file=sys.stderr)
    
    if not numbers:
        print("Error: No numbers extracted from glyph2tile array", file=sys.stderr)
        sys.exit(1)
    
    return numbers


def main():
    if len(sys.argv) != 2:
        print("Usage: extract_glyph2tile.py <path/to/tile.c>", file=sys.stderr)
        print("", file=sys.stderr)
        print("Example:", file=sys.stderr)
        print("  python extract_glyph2tile.py src/tile.c", file=sys.stderr)
        sys.exit(1)
    
    tile_c_path = sys.argv[1]
    
    # Extract the mapping
    mapping = extract_glyph2tile(tile_c_path)
    
    # Write directly to output file with UTF-8 encoding, no BOM
    output_path = "webhack-client/public/tilesets/glyph2tile_default.json"
    try:
        with open(output_path, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(mapping, f, separators=(',', ':'), ensure_ascii=True)
            f.write('\n')
        
        # Print summary
        print(f"Successfully wrote {len(mapping)} glyph-to-tile mappings to {output_path}")
        print(f"Glyph range: 0-{len(mapping)-1}")
        print(f"Unique tiles used: {len(set(mapping))}")
    except Exception as e:
        print(f"Error writing file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
