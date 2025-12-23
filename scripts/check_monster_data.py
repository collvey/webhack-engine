#!/usr/bin/env python3
"""
Quick check of generated monster data
"""
import json
from pathlib import Path

def main():
    repo_root = Path(__file__).parent.parent
    data_path = repo_root / 'webhack-client' / 'public' / 'data' / 'monster-data.json'
    
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    print(f"Total monsters: {len(data)}")
    print("\n=== Sample Monsters ===\n")
    
    for i in [0, 50, 100, 200, 300]:
        if str(i) not in data:
            continue
        m = data[str(i)]
        print(f"ID {i}: {m['name']}")
        print(f"  Symbol: {m['symbol']} ({m['color']})")
        print(f"  Level: {m['level']}, Difficulty: {m['difficulty']}")
        print(f"  Speed: {m['speed']}, AC: {m['ac']}, MR: {m['mr']}")
        print(f"  Size: {m['size']}, Weight: {m['weight']}, Nutrition: {m['nutrition']}")
        print(f"  Attacks: {len(m['attacks'])}")
        if m['attacks']:
            for atk in m['attacks']:
                print(f"    - {atk['type']} ({atk['damage_type']}) {atk['dice']}")
        print(f"  Resistances: {', '.join(m['resistances']) if m['resistances'] else 'none'}")
        print(f"  Flags: {len(m['flags'])} total")
        print()

if __name__ == '__main__':
    main()
