#!/usr/bin/env python3
"""
Parse monst.c and generate a comprehensive monster JSON database.
"""

import re
import json
import sys
from pathlib import Path

# Color mappings
COLORS = {
    'CLR_BLACK': 'black',
    'CLR_RED': 'red',
    'CLR_GREEN': 'green',
    'CLR_BROWN': 'brown',
    'CLR_BLUE': 'blue',
    'CLR_MAGENTA': 'magenta',
    'CLR_CYAN': 'cyan',
    'CLR_GRAY': 'gray',
    'CLR_ORANGE': 'orange',
    'CLR_BRIGHT_GREEN': 'bright green',
    'CLR_YELLOW': 'yellow',
    'CLR_BRIGHT_BLUE': 'bright blue',
    'CLR_BRIGHT_MAGENTA': 'bright magenta',
    'CLR_BRIGHT_CYAN': 'bright cyan',
    'CLR_WHITE': 'white',
    'HI_DOMESTIC': 'white',  # CLR_WHITE
    'HI_LORD': 'magenta',    # CLR_MAGENTA
    'HI_ZAP': 'bright blue', # CLR_BRIGHT_BLUE
}

# Symbol mappings
SYMBOLS = {
    'S_ANT': 'a',
    'S_BLOB': 'b',
    'S_COCKATRICE': 'c',
    'S_DOG': 'd',
    'S_EYE': 'e',
    'S_FELINE': 'f',
    'S_GREMLIN': 'g',
    'S_HUMANOID': 'h',
    'S_IMP': 'i',
    'S_JELLY': 'j',
    'S_KOBOLD': 'k',
    'S_LEPRECHAUN': 'l',
    'S_MIMIC': 'm',
    'S_NYMPH': 'n',
    'S_ORC': 'o',
    'S_PIERCER': 'p',
    'S_QUADRUPED': 'q',
    'S_RODENT': 'r',
    'S_SPIDER': 's',
    'S_TRAPPER': 't',
    'S_UNICORN': 'u',
    'S_VORTEX': 'v',
    'S_WORM': 'w',
    'S_XAN': 'x',
    'S_LIGHT': 'y',
    'S_ZRUTY': 'z',
    'S_ANGEL': 'A',
    'S_BAT': 'B',
    'S_CENTAUR': 'C',
    'S_DRAGON': 'D',
    'S_ELEMENTAL': 'E',
    'S_FUNGUS': 'F',
    'S_GNOME': 'G',
    'S_GIANT': 'H',
    'S_JABBERWOCK': 'J',
    'S_KOP': 'K',
    'S_LICH': 'L',
    'S_MUMMY': 'M',
    'S_NAGA': 'N',
    'S_OGRE': 'O',
    'S_PUDDING': 'P',
    'S_QUANTMECH': 'Q',
    'S_RUSTMONST': 'R',
    'S_SNAKE': 'S',
    'S_TROLL': 'T',
    'S_UMBER': 'U',
    'S_VAMPIRE': 'V',
    'S_WRAITH': 'W',
    'S_XORN': 'X',
    'S_YETI': 'Y',
    'S_ZOMBIE': 'Z',
    'S_HUMAN': '@',
    'S_GHOST': ' ',
    'S_GOLEM': "'",
    'S_DEMON': '&',
    'S_EEL': ';',
    'S_LIZARD': ':',
}

# Attack type mappings
ATTACK_TYPES = {
    'AT_NONE': 'passive',
    'AT_CLAW': 'claw',
    'AT_BITE': 'bite',
    'AT_KICK': 'kick',
    'AT_BUTT': 'butt',
    'AT_TUCH': 'touch',
    'AT_STNG': 'sting',
    'AT_HUGS': 'hug',
    'AT_SPIT': 'spit',
    'AT_ENGL': 'engulf',
    'AT_BREA': 'breath',
    'AT_EXPL': 'explode',
    'AT_BOOM': 'boom',
    'AT_GAZE': 'gaze',
    'AT_TENT': 'tentacle',
    'AT_WEAP': 'weapon',
    'AT_MAGC': 'magic',
}

# Damage type mappings
DAMAGE_TYPES = {
    'AD_PHYS': 'physical',
    'AD_MAGM': 'magic missile',
    'AD_FIRE': 'fire',
    'AD_COLD': 'cold',
    'AD_SLEE': 'sleep',
    'AD_DISN': 'disintegration',
    'AD_ELEC': 'shock',
    'AD_DRST': 'poison',
    'AD_ACID': 'acid',
    'AD_BLND': 'blind',
    'AD_STUN': 'stun',
    'AD_SLOW': 'slow',
    'AD_PLYS': 'paralysis',
    'AD_DRLI': 'drain life',
    'AD_DREN': 'drain magic',
    'AD_LEGS': 'damage legs',
    'AD_STON': 'petrify',
    'AD_STCK': 'stick',
    'AD_SGLD': 'steal gold',
    'AD_SITM': 'steal item',
    'AD_SEDU': 'seduce',
    'AD_TLPT': 'teleport',
    'AD_RUST': 'rust',
    'AD_CONF': 'confuse',
    'AD_DGST': 'digest',
    'AD_HEAL': 'heal',
    'AD_WRAP': 'wrap',
    'AD_WERE': 'lycanthropy',
    'AD_DRDX': 'drain dexterity',
    'AD_DRCO': 'drain constitution',
    'AD_DRIN': 'drain intelligence',
    'AD_DISE': 'disease',
    'AD_DCAY': 'decay',
    'AD_SSEX': 'seduce',
    'AD_HALU': 'hallucination',
    'AD_DETH': 'death',
    'AD_PEST': 'pestilence',
    'AD_FAMN': 'famine',
    'AD_SLIM': 'slime',
    'AD_ENCH': 'disenchant',
    'AD_CORR': 'corrode',
    'AD_CLRC': 'clerical spell',
    'AD_SPEL': 'magic spell',
    'AD_RBRE': 'random breath',
    'AD_SAMU': 'steal amulet',
    'AD_CURS': 'curse',
}

# Size mappings
SIZES = {
    'MZ_TINY': 'tiny',
    'MZ_SMALL': 'small',
    'MZ_MEDIUM': 'medium',
    'MZ_LARGE': 'large',
    'MZ_HUGE': 'huge',
    'MZ_GIGANTIC': 'gigantic',
    '0': 'tiny',
    '1': 'small',
    '2': 'medium',
    '3': 'large',
    '4': 'huge',
    '7': 'gigantic',
}

# Resistance mappings
RESISTANCES = {
    'MR_FIRE': 'fire',
    'MR_COLD': 'cold',
    'MR_SLEEP': 'sleep',
    'MR_DISINT': 'disintegration',
    'MR_ELEC': 'shock',
    'MR_POISON': 'poison',
    'MR_ACID': 'acid',
    'MR_STONE': 'stone',
}

# M1 flags
M1_FLAGS = {
    'M1_FLY': 'can fly',
    'M1_SWIM': 'can swim',
    'M1_AMORPHOUS': 'amorphous',
    'M1_WALLWALK': 'can phase through walls',
    'M1_CLING': 'can cling to ceiling',
    'M1_TUNNEL': 'can tunnel',
    'M1_NEEDPICK': 'needs pick to tunnel',
    'M1_CONCEAL': 'conceals under objects',
    'M1_HIDE': 'can hide',
    'M1_AMPHIBIOUS': 'amphibious',
    'M1_BREATHLESS': 'breathless',
    'M1_NOTAKE': 'cannot pick up objects',
    'M1_NOEYES': 'no eyes',
    'M1_NOHANDS': 'has no hands',
    'M1_NOLIMBS': 'no limbs',
    'M1_NOHEAD': 'no head',
    'M1_MINDLESS': 'mindless',
    'M1_HUMANOID': 'humanoid',
    'M1_ANIMAL': 'is an animal',
    'M1_SLITHY': 'serpentine body',
    'M1_UNSOLID': 'unsolid',
    'M1_THICK_HIDE': 'thick hide',
    'M1_OVIPAROUS': 'can lay eggs',
    'M1_REGEN': 'regenerates',
    'M1_SEE_INVIS': 'sees invisible',
    'M1_TPORT': 'can teleport',
    'M1_TPORT_CNTRL': 'teleport control',
    'M1_ACID': 'acidic',
    'M1_POIS': 'poisonous',
    'M1_CARNIVORE': 'is carnivorous',
    'M1_HERBIVORE': 'herbivorous',
    'M1_OMNIVORE': 'omnivorous',
    'M1_METALLIVORE': 'eats metal',
}

# M2 flags
M2_FLAGS = {
    'M2_NOPOLY': 'no polymorph',
    'M2_UNDEAD': 'undead',
    'M2_WERE': 'lycanthrope',
    'M2_HUMAN': 'human',
    'M2_ELF': 'elf',
    'M2_DWARF': 'dwarf',
    'M2_GNOME': 'gnome',
    'M2_ORC': 'orc',
    'M2_DEMON': 'demon',
    'M2_MERC': 'mercenary',
    'M2_LORD': 'lord',
    'M2_PRINCE': 'prince',
    'M2_MINION': 'minion',
    'M2_GIANT': 'giant',
    'M2_SHAPESHIFTER': 'shapeshifter',
    'M2_MALE': 'male',
    'M2_FEMALE': 'female',
    'M2_NEUTER': 'neuter',
    'M2_PNAME': 'proper name',
    'M2_HOSTILE': 'normally generated hostile',
    'M2_PEACEFUL': 'always peaceful',
    'M2_DOMESTIC': 'can be tamed',
    'M2_WANDER': 'wanders',
    'M2_STALK': 'stalks',
    'M2_NASTY': 'nasty',
    'M2_STRONG': 'strong',
    'M2_ROCKTHROW': 'throws rocks',
    'M2_GREEDY': 'greedy',
    'M2_JEWELS': 'likes jewels',
    'M2_COLLECT': 'collects items',
    'M2_MAGIC': 'collects magic',
}

# M3 flags
M3_FLAGS = {
    'M3_WANTSAMUL': 'wants amulet',
    'M3_WANTSBELL': 'wants bell',
    'M3_WANTSBOOK': 'wants book',
    'M3_WANTSCAND': 'wants candelabrum',
    'M3_WANTSARTI': 'wants artifact',
    'M3_WAITFORU': 'waits for you',
    'M3_CLOSE': 'lets you close',
    'M3_INFRAVISION': 'has infravision',
    'M3_INFRAVISIBLE': 'visible by infravision',
    'M3_DISPLACES': 'displaces monsters',
}

# Geno flags
GENO_FLAGS = {
    'G_UNIQ': 'unique',
    'G_NOHELL': 'not in hell',
    'G_HELL': 'hell only',
    'G_NOGEN': 'special generation',
    'G_SGROUP': 'normally appears in small groups',
    'G_LGROUP': 'normally appears in large groups',
    'G_GENO': 'genocidable',
    'G_NOCORPSE': 'no corpse',
}


def parse_flags(flag_string, flag_dict):
    """Parse flag expressions like 'M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE'"""
    flags = []
    if not flag_string or flag_string == '0':
        return flags
    
    parts = [p.strip() for p in flag_string.split('|')]
    for part in parts:
        if part in flag_dict:
            flags.append(flag_dict[part])
    
    return flags


def parse_resistances(resist_string):
    """Parse resistance flags"""
    return parse_flags(resist_string, RESISTANCES)


def parse_attack(attack_str):
    """Parse an ATTK() expression"""
    match = re.search(r'ATTK\((\w+),\s*(\w+),\s*(\d+),\s*(\d+)\)', attack_str)
    if not match:
        return None
    
    at_type, ad_type, num_dice, dice_sides = match.groups()
    
    if at_type == 'AT_NONE' or at_type == '0':
        return None
    
    return {
        'type': ATTACK_TYPES.get(at_type, at_type),
        'damage_type': DAMAGE_TYPES.get(ad_type, ad_type),
        'dice': f"{num_dice}d{dice_sides}" if num_dice != '0' else None
    }


def parse_attacks(attacks_str):
    """Parse A() expression containing multiple attacks"""
    attacks = []
    # Find all ATTK expressions
    for match in re.finditer(r'ATTK\([^)]+\)', attacks_str):
        attack = parse_attack(match.group(0))
        if attack:
            attacks.append(attack)
    
    return attacks


def calculate_difficulty(level, attacks, flags):
    """Calculate difficulty similar to makedefs"""
    # This is a simplified version - the actual calculation is more complex
    difficulty = level
    
    # Add attack bonuses
    for attack in attacks:
        if attack:
            difficulty += 1
    
    return difficulty


def parse_geno_flags(geno_str):
    """Parse geno flags and extract frequency"""
    flags = []
    frequency = 0
    
    if not geno_str or geno_str == '0':
        return flags, frequency
    
    # Extract frequency (0-7) - it's ORed in at the end
    # Look for patterns like "| 3" or "| 2)" at the end
    freq_match = re.search(r'\|\s*(\d)\s*\)?$', geno_str)
    if freq_match:
        frequency = int(freq_match.group(1))
    
    # Parse other flags
    for flag, desc in GENO_FLAGS.items():
        if flag in geno_str:
            flags.append(desc)
    
    return flags, frequency


def parse_mon_entry(mon_text, monster_id):
    """Parse a single MON() entry"""
    # Extract monster name
    name_match = re.search(r'MON\("([^"]+)"', mon_text)
    if not name_match:
        return None
    
    name = name_match.group(1)
    
    # Extract symbol
    symbol_match = re.search(r'MON\("[^"]+",\s*(\w+),', mon_text)
    symbol = SYMBOLS.get(symbol_match.group(1), '?') if symbol_match else '?'
    
    # Extract LVL() parameters: level, move, ac, mr, alignment
    lvl_match = re.search(r'LVL\((\d+),\s*(\d+),\s*(-?\d+),\s*(\d+),\s*(-?\d+)\)', mon_text)
    if not lvl_match:
        return None
    
    level, speed, ac, mr, alignment = lvl_match.groups()
    
    # Extract geno flags
    geno_match = re.search(r'LVL\([^)]+\),\s*\(([^)]+)\)', mon_text)
    geno_text = geno_match.group(1) if geno_match else ''
    geno_flags, frequency = parse_geno_flags(geno_text)
    
    # Extract attacks
    attacks_match = re.search(r'A\(([^)]+(?:\([^)]*\)[^)]*)*)\)', mon_text)
    attacks = parse_attacks(attacks_match.group(0) if attacks_match else '')
    
    # Extract SIZ() parameters: weight, nutrition, sound, size
    siz_match = re.search(r'SIZ\((\d+),\s*(\d+),\s*\w+,\s*(\w+)\)', mon_text)
    weight, nutrition, size = ('0', '0', 'MZ_MEDIUM')
    if siz_match:
        weight, nutrition, size = siz_match.group(1), siz_match.group(2), siz_match.group(3)
    
    # Extract resistances - after SIZ(), before M1
    # Pattern: SIZ(...), resist1, resist2, M1_...
    resist_match = re.search(r'SIZ\([^)]+\),\s*([^,]+?),\s*([^,]+?),\s*M1', mon_text)
    resistances = []
    conveys = []
    if resist_match:
        resistances = parse_resistances(resist_match.group(1).strip())
        conveys = parse_resistances(resist_match.group(2).strip())
    
    # Extract M1, M2, M3 flags and final difficulty/color
    # Find the last 5 comma-separated items - these are M1, M2, M3, difficulty, color
    # Work backwards from the end
    # Pattern: ...M1_flags, M2_flags, M3_flags, difficulty, CLR_color)
    # Find last occurrence of ), then work backwards
    final_match = re.search(r'([^,]+),\s*([^,]+),\s*([^,]+),\s*(\d+),\s*(\w+)\s*\)$', mon_text)
    m1_flags = []
    m2_flags = []
    m3_flags = []
    difficulty = level
    color = 'brown'
    
    if final_match:
        m1_text = final_match.group(1).strip()
        m2_text = final_match.group(2).strip()
        m3_text = final_match.group(3).strip()
        difficulty = final_match.group(4)
        color_code = final_match.group(5)
        
        m1_flags = parse_flags(m1_text, M1_FLAGS)
        m2_flags = parse_flags(m2_text, M2_FLAGS)
        m3_flags = parse_flags(m3_text, M3_FLAGS)
        color = COLORS.get(color_code, 'brown')
    
    # Build the monster data
    monster = {
        'name': name,
        'symbol': symbol,
        'color': color,
        'difficulty': int(difficulty) if difficulty.isdigit() else int(level),
        'level': int(level),
        'speed': int(speed),
        'ac': int(ac),
        'mr': int(mr),
        'alignment': int(alignment),
        'weight': int(weight),
        'nutrition': int(nutrition),
        'size': SIZES.get(size, 'medium'),
        'frequency': frequency,
        'attacks': attacks,
        'resistances': resistances,
        'conveys': conveys,
        'flags': m1_flags + m2_flags + m3_flags,
        'geno_flags': geno_flags,
    }
    
    return monster


def find_matching_paren(text, start):
    """Find the matching closing parenthesis"""
    count = 1
    i = start + 1
    while i < len(text) and count > 0:
        if text[i] == '(':
            count += 1
        elif text[i] == ')':
            count -= 1
        i += 1
    return i if count == 0 else -1


def parse_monst_c(filepath):
    """Parse monst.c and extract all monster definitions"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all MON() entries by looking for MON(" - this avoids the macro definition
    monsters = {}
    monster_id = 0
    
    pos = 0
    while True:
        pos = content.find('MON("', pos)
        if pos == -1:
            break
        
        # Find the matching closing parenthesis
        end = find_matching_paren(content, pos + 3)
        if end == -1:
            break
        
        mon_text = content[pos:end]
        # Clean up the text - normalize whitespace
        mon_text = ' '.join(mon_text.split())
        
        monster = parse_mon_entry(mon_text, monster_id)
        
        if monster:
            monsters[str(monster_id)] = monster
            print(f"Parsed {monster_id}: {monster['name']}")
            monster_id += 1
        
        pos = end
    
    return monsters


def main():
    # Get the repository root (assuming script is in scripts/ directory)
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    
    monst_c_path = repo_root / 'src' / 'monst.c'
    output_path = repo_root / 'webhack-client' / 'public' / 'data' / 'monster-data.json'
    
    if not monst_c_path.exists():
        print(f"Error: Could not find {monst_c_path}")
        sys.exit(1)
    
    print(f"Parsing {monst_c_path}...")
    monsters = parse_monst_c(monst_c_path)
    
    print(f"\nParsed {len(monsters)} monsters")
    print(f"Writing to {output_path}...")
    
    # Create output directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON with pretty formatting
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(monsters, f, indent=2, ensure_ascii=False)
    
    print(f"Successfully created {output_path}")
    
    # Show a sample entry
    if monsters:
        sample_id = list(monsters.keys())[0]
        print(f"\nSample entry (monster {sample_id}):")
        print(json.dumps(monsters[sample_id], indent=2))


if __name__ == '__main__':
    main()
