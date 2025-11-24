#!/usr/bin/env python3
"""
Generate items.json from NetHackData.ts OBJECTS definition.
NetHackData.ts is the source of truth.
"""

import re
import json

def determine_symbol_from_name(name, obj_id):
    """Determine symbol based on ID and name patterns."""
    
    # ID-based ranges from NetHackData.ts inspection
    if obj_id == 0:
        return '?'
    elif obj_id >= 1 and obj_id <= 70:  # Weapons
        return ')'
    elif obj_id >= 71 and obj_id <= 149:  # Armor (boots end at 149)
        return '['
    elif obj_id >= 150 and obj_id <= 177:  # Rings (Rin prefix)
        return '='
    elif obj_id >= 178 and obj_id <= 188:  # Amulets
        return '"'
    elif obj_id >= 189 and obj_id <= 238:  # Tools
        return '('
    elif obj_id >= 239 and obj_id <= 271:  # Food (ends at Tin)
        return '%'
    elif obj_id >= 272 and obj_id <= 297:  # Potions (POT_ prefix)
        return '!'
    elif obj_id >= 298 and obj_id <= 339:  # Scrolls (SCR_ prefix, with gap 319-338)
        return '?'
    elif obj_id >= 340 and obj_id <= 382:  # Spellbooks (SPE_ prefix)
        return '+'
    elif obj_id >= 383 and obj_id <= 406:  # Wands (WAN_ prefix, gap 407-409)
        return '/'
    elif obj_id == 410:  # Gold piece
        return '$'
    elif obj_id >= 411 and obj_id <= 446:  # GEM_CLASS: Precious gems + gray stones (gap 433-441)
        return '*'
    elif obj_id >= 447 and obj_id <= 448:  # ROCK_CLASS: Boulder and Statue
        return '`'
    elif obj_id == 449:  # Heavy iron ball
        return '0'
    elif obj_id == 450:  # Iron chain
        return '_'
    elif obj_id >= 451 and obj_id <= 452:  # Venom
        return '.'
    else:
        return '?'

def clean_name(name):
    """Clean up name by removing prefixes."""
    # Remove common prefixes
    name = name.replace('Rin ', '').replace('Pot ', '').replace('Scr ', '').replace('Spe ', '').replace('Wan ', '')
    name = name.replace('Amulet Of ', '').replace('Amulet Versus ', '')
    return name

def generate_description(name, symbol):
    """Generate description based on symbol/type."""
    
    clean = clean_name(name)
    
    if symbol == '!':
        return f'Potion of {clean.lower()}'
    elif symbol == '?':
        return f'Scroll of {clean.lower()}'
    elif symbol == '+':
        return f'Spellbook of {clean.lower()}'
    elif symbol == '/':
        return f'Wand of {clean.lower()}'
    elif symbol == '=':
        return f'Ring of {clean.lower()}'
    elif symbol == '"':
        return name  # Amulets keep full name
    else:
        return name

def extract_objects_from_nethackdata():
    """Extract objects from NetHackData.ts."""
    
    with open('../webhack-client/src/data/NetHackData.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the OBJECTS section
    objects_match = re.search(r'export const OBJECTS: Record<number, ObjectData> = \{(.*?)\n\};', content, re.DOTALL)
    
    if not objects_match:
        raise ValueError("Could not find OBJECTS definition")
    
    objects_section = objects_match.group(1)
    
    # Parse each object entry
    # Pattern: id: { id: num, name: 'Name', internalName: 'INTERNAL' }
    pattern = r"(\d+):\s*\{\s*id:\s*\d+,\s*name:\s*'([^']+)',\s*internalName:\s*'([^']+)'\s*\}"
    
    objects_dict = {}
    
    for match in re.finditer(pattern, objects_section):
        obj_id = int(match.group(1))
        name = match.group(2)
        internal_name = match.group(3)
        
        # Determine symbol
        symbol = determine_symbol_from_name(name, obj_id)
        
        # Generate description
        description = generate_description(name, symbol)
        
        # Clean name for display
        clean = clean_name(name)
        
        objects_dict[str(obj_id)] = {
            'name': clean,
            'symbol': symbol,
            'description': description
        }
    
    return objects_dict

def main():
    print("Extracting objects from NetHackData.ts...")
    
    objects_dict = extract_objects_from_nethackdata()
    
    print(f"Found {len(objects_dict)} objects")
    
    # Show key samples
    print("\nSample objects:")
    for obj_id in ['17', '185', '189', '282', '283']:
        if obj_id in objects_dict:
            obj = objects_dict[obj_id]
            print(f"  {obj_id}: {obj['name']} ({obj['symbol']}) - {obj['description']}")
    
    # Write to items.json
    output_file = '../webhack-client/public/data/items.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(objects_dict, f, indent=2, ensure_ascii=False)
    
    print(f"\nWrote {len(objects_dict)} items to {output_file}")
    
    # Verify tools
    tools = {k: v for k, v in objects_dict.items() if v['symbol'] == '('}
    print(f"\nTools (symbol '('): {len(tools)} items")
    print("First 5 tools:")
    for obj_id in sorted(tools.keys(), key=int)[:5]:
        obj = tools[obj_id]
        print(f"  {obj_id}: {obj['name']}")
    
    # Verify amulets
    amulets = {k: v for k, v in objects_dict.items() if v['symbol'] == '"'}
    print(f"\nAmulets (symbol '\"'): {len(amulets)} items")
    for obj_id in sorted(amulets.keys(), key=int):
        obj = amulets[obj_id]
        print(f"  {obj_id}: {obj['name']}")

if __name__ == '__main__':
    main()
