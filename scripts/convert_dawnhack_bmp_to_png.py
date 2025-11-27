"""
Convert DawnHack BMP tileset to PNG format with proper transparency.
DawnHack uses 32x32 tiles in a grid layout with magenta (255,0,255) as transparent color.
"""

from PIL import Image
import os

# Input and output paths
input_bmp = r'webhack-client\public\tilesets\dawnhack_32.bmp'
output_png = r'webhack-client\public\tilesets\dawnhack_32.png'

# Check if input file exists
if not os.path.exists(input_bmp):
    print(f"Error: Input file not found: {input_bmp}")
    exit(1)

print(f"Loading BMP file: {input_bmp}")

# Load the BMP file
bmp = Image.open(input_bmp)

print(f"Original dimensions: {bmp.width}×{bmp.height}")
print(f"Original mode: {bmp.mode}")

# Convert to RGBA if not already
if bmp.mode != 'RGBA':
    bmp = bmp.convert('RGBA')
    print("Converted to RGBA mode")

# Get pixel data
pixels = bmp.load()

# Make magenta (255,0,255) transparent
magenta_count = 0
for y in range(bmp.height):
    for x in range(bmp.width):
        r, g, b = pixels[x, y][:3]
        if r == 255 and g == 0 and b == 255:  # Magenta
            pixels[x, y] = (0, 0, 0, 0)  # Fully transparent
            magenta_count += 1

print(f"Converted {magenta_count} magenta pixels to transparent")

# Calculate tile statistics
tile_width = 32
tile_height = 32
tiles_per_row = bmp.width // tile_width
tiles_per_col = bmp.height // tile_height
total_tiles = tiles_per_row * tiles_per_col

print(f"Tile layout: {tiles_per_row} tiles/row × {tiles_per_col} rows = {total_tiles} tiles")

# Save as PNG
bmp.save(output_png, 'PNG')
print(f"✅ Saved PNG file: {output_png}")
print(f"Final dimensions: {bmp.width}×{bmp.height}")
print(f"Total tiles: {total_tiles}")
