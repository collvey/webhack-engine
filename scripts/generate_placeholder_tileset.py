#!/usr/bin/env python3
"""
Generate a placeholder tileset PNG for WebHack development.

This creates a simple colored grid tileset as a placeholder until
actual NetHack tiles are available. Each tile is uniquely colored
to help with debugging tile positioning.

Usage:
    python scripts/generate_placeholder_tileset.py
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Configuration
TILE_WIDTH = 32
TILE_HEIGHT = 32
TILES_PER_ROW = 20
NUM_TILES = 1404
OUTPUT_PATH = "webhack-client/public/tilesets/default_32.png"

# Calculate dimensions
output_width = TILES_PER_ROW * TILE_WIDTH
num_rows = (NUM_TILES + TILES_PER_ROW - 1) // TILES_PER_ROW
output_height = num_rows * TILE_HEIGHT

print(f"Generating placeholder tileset...")
print(f"  Dimensions: {output_width}×{output_height} pixels")
print(f"  Tiles: {NUM_TILES} ({TILES_PER_ROW} per row, {num_rows} rows)")

# Create output image with transparency
img = Image.new('RGBA', (output_width, output_height), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Try to load a font for tile numbers
try:
    font = ImageFont.truetype("arial.ttf", 10)
except:
    font = ImageFont.load_default()

# Generate each tile
for i in range(NUM_TILES):
    # Calculate position
    col = i % TILES_PER_ROW
    row = i // TILES_PER_ROW
    x = col * TILE_WIDTH
    y = row * TILE_HEIGHT
    
    # Generate a unique color based on tile index
    # Use HSV-like color distribution for variety
    hue = (i * 137) % 360  # Golden angle for good distribution
    saturation = 0.5 + (i % 5) * 0.1  # Vary saturation
    value = 0.6 + (i % 3) * 0.1  # Vary brightness
    
    # Convert HSV to RGB (simplified)
    h = hue / 60
    c = value * saturation
    x_val = c * (1 - abs(h % 2 - 1))
    m = value - c
    
    if h < 1:
        r, g, b = c, x_val, 0
    elif h < 2:
        r, g, b = x_val, c, 0
    elif h < 3:
        r, g, b = 0, c, x_val
    elif h < 4:
        r, g, b = 0, x_val, c
    elif h < 5:
        r, g, b = x_val, 0, c
    else:
        r, g, b = c, 0, x_val
    
    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)
    
    # Draw tile background
    draw.rectangle(
        [x, y, x + TILE_WIDTH - 1, y + TILE_HEIGHT - 1],
        fill=(r, g, b, 255),
        outline=(0, 0, 0, 255),
        width=1
    )
    
    # Draw tile number
    text = str(i)
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = x + (TILE_WIDTH - text_width) // 2
    text_y = y + (TILE_HEIGHT - text_height) // 2
    
    # Draw text with outline for visibility
    for dx, dy in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
        draw.text((text_x + dx, text_y + dy), text, font=font, fill=(0, 0, 0, 255))
    draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))

# Save the image
img.save(OUTPUT_PATH, 'PNG')
print(f"\nPlaceholder tileset saved to: {OUTPUT_PATH}")
print(f"\nNOTE: This is a placeholder for development!")
print(f"Replace with actual NetHack tiles for production use.")
print(f"See TILESET_PNG_GUIDE.md for instructions on creating proper tiles.")
