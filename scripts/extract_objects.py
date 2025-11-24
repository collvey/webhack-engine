#!/usr/bin/env python3
"""
Extract object definitions from NetHack objects.c and generate items.json
Objects are indexed sequentially starting from 0 in the objects[] array.
"""

import re
import json

def extract_objects():
    """Parse objects.c and extract all object definitions."""
    
    with open('../src/objects.c', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Symbol map for each object class
    SYMBOL_MAP = {
        'WEAPON': ')',
        'ARMOR': '[',
        'RING': '=',
        'AMULET': '"',
        'TOOL': '(',
        'FOOD': '%',
        'POTION': '!',
        'SCROLL': '?',
        'SPBOOK': '+',
        'WAND': '/',
        'COIN': '$',
        'GEM': '*',
        'ROCK': '`',
        'BALL': '0',
        'CHAIN': '_',
        'VENOM': '.'
    }
    
    # Patterns to match object names from macro definitions
    # These match the first quoted string after the macro name
    macro_patterns = [
        ('PROJECTILE', 'WEAPON'),
        ('WEAPON', 'WEAPON'),
        ('BOW', 'WEAPON'),
        ('ARMOR', 'ARMOR'),
        ('HELM', 'ARMOR'),
        ('CLOAK', 'ARMOR'),
        ('SHIELD', 'ARMOR'),
        ('GLOVES', 'ARMOR'),
        ('BOOTS', 'ARMOR'),
        ('RING', 'RING'),
        ('AMULET', 'AMULET'),
        ('TOOL', 'TOOL'),
        ('FOOD', 'FOOD'),
        ('POTION', 'POTION'),
        ('SCROLL', 'SCROLL'),
        ('SPELL', 'SPBOOK'),
        ('WAND', 'WAND'),
        ('COIN', 'COIN'),
        ('GEM', 'GEM'),
        ('ROCK', 'ROCK'),
    ]
    
    objects_list = []
    obj_id = 0
    
    # Find the objects array section
    start_marker = 'NEARDATA struct objclass objects[]'
    end_marker = '#ifndef OBJECTS_PASS_2_'
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError("Could not find objects array in file")
    
    objects_section = content[start_idx:end_idx]
    lines = objects_section.split('\n')
    
    for line in lines:
        # Skip empty lines and comments
        stripped = line.strip()
        if not stripped or stripped.startswith('/*') or stripped.startswith('*') or stripped.startswith('//'):
            continue
        
        # Look for OBJECT calls (including through macros)
        found_object = False
        obj_name = None
        obj_class = None
        
        # Check for direct OBJECT calls
        direct_match = re.search(r'OBJECT\(OBJ\("([^"]+)"', line)
        if direct_match:
            obj_name = direct_match.group(1)
            # Find class
            class_match = re.search(r'([A-Z_]+)_CLASS', line)
            if class_match:
                obj_class = class_match.group(1)
                found_object = True
        
        # Check for macro calls
        if not found_object:
            for macro_name, class_name in macro_patterns:
                if line.startswith(macro_name + '('):
                    # Extract name from first quoted string
                    name_match = re.search(r'"([^"]+)"', line)
                    if name_match:
                        obj_name = name_match.group(1)
                        obj_class = class_name
                        found_object = True
                        break
        
        if found_object and obj_name and obj_name != 'None' and obj_class:
            symbol = SYMBOL_MAP.get(obj_class, '?')
            objects_list.append({
                'id': obj_id,
                'name': obj_name,
                'symbol': symbol,
                'class': obj_class
            })
        
        # Increment ID for every object-defining line (even if name is None)
        if found_object or 'OBJECT(' in line or any(line.startswith(m[0]+'(') for m in macro_patterns):
            obj_id += 1
    
    return objects_list

def add_descriptions(objects_list):
    """Add descriptions to objects."""
    
    # Common descriptions
    descriptions = {
        # Potions
        'gain ability': 'Increases random ability score',
        'restore ability': 'Restores drained abilities',
        'confusion': 'Causes confusion',
        'blindness': 'Causes temporary blindness',
        'paralysis': 'Paralyzes you',
        'speed': 'Increases movement speed',
        'levitation': 'Float above ground',
        'hallucination': 'Causes hallucinations',
        'invisibility': 'Makes you invisible',
        'see invisible': 'Reveals invisible creatures',
        'healing': 'Restores health',
        'extra healing': 'Greatly restores health',
        'full healing': 'Fully restores health',
        'gain level': 'Increases experience level',
        'enlightenment': 'Reveals information',
        'monster detection': 'Detects nearby monsters',
        'object detection': 'Detects nearby objects',
        'gain energy': 'Increases magical energy',
        'sleeping': 'Puts you to sleep',
        'polymorph': 'Changes form',
        'booze': 'Alcoholic beverage',
        'sickness': 'Causes illness',
        'fruit juice': 'Refreshing drink',
        'acid': 'Corrosive liquid',
        'oil': 'Flammable liquid',
        'water': 'Clear liquid',
    }
    
    for obj in objects_list:
        if obj['name'] in descriptions:
            obj['description'] = descriptions[obj['name']]
        else:
            # Generic descriptions
            if obj['class'] == 'POTION':
                obj['description'] = f"Potion of {obj['name']}"
            elif obj['class'] == 'SCROLL':
                obj['description'] = f"Scroll of {obj['name']}"
            elif obj['class'] == 'SPBOOK':
                obj['description'] = f"Spellbook of {obj['name']}"
            elif obj['class'] == 'WAND':
                obj['description'] = f"Wand of {obj['name']}"
            else:
                obj['description'] = obj['name'].capitalize()
    
    return objects_list

def main():
    print("Extracting objects from objects.c...")
    objects_list = extract_objects()
    
    print(f"Found {len(objects_list)} objects")
    
    # Add descriptions
    objects_list = add_descriptions(objects_list)
    
    # Show sample
    print("\nFirst 10 objects:")
    for obj in objects_list[:10]:
        print(f"  {obj['id']}: {obj['name']} ({obj['symbol']}) - {obj['class']}")
    
    print(f"\nObjects 250-260 (around potions):")
    for obj in objects_list[250:261]:
        print(f"  {obj['id']}: {obj['name']} ({obj['symbol']}) - {obj['class']}")
    
    # Convert to JSON format: { "id": { "name": "...", "symbol": "...", "description": "..." } }
    items_dict = {}
    for obj in objects_list:
        items_dict[str(obj['id'])] = {
            'name': obj['name'],
            'symbol': obj['symbol'],
            'description': obj['description']
        }
    
    # Write to items.json
    output_file = '../webhack-client/public/data/items.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(items_dict, f, indent=2, ensure_ascii=False)
    
    print(f"\nWrote {len(items_dict)} items to {output_file}")
    
    # Show potions specifically
    potions = [obj for obj in objects_list if obj['class'] == 'POTION']
    print(f"\nFound {len(potions)} potions:")
    for pot in potions:
        print(f"  {pot['id']}: {pot['name']}")

if __name__ == '__main__':
    main()
