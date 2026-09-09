import os
from PIL import Image, ImageDraw

SOURCE_IMAGE = r"C:\Users\HP\.gemini\antigravity-ide\brain\2a3f8562-26e5-4b59-8264-dfa1229a97d1\.user_uploaded\media_1788781143216.png"
ANDROID_RES = r"frontend\android\app\src\main\res"
PUBLIC_DIR = r"frontend\public"

# Load source image
src = Image.open(SOURCE_IMAGE).convert("RGBA")

# 1. Update frontend public assets
os.makedirs(PUBLIC_DIR, exist_ok=True)
bus_icon_512 = src.resize((512, 512), Image.Resampling.LANCZOS)
bus_icon_512.save(os.path.join(PUBLIC_DIR, "bus-icon.png"), "PNG")
bus_icon_192 = src.resize((192, 192), Image.Resampling.LANCZOS)
bus_icon_192.save(os.path.join(PUBLIC_DIR, "bus-icon-192.png"), "PNG")
print("Saved frontend public/bus-icon.png (512x512 and 192x192)")

# Density configurations for Android launcher icons
# (density_name, foreground_canvas_size, legacy_icon_size)
DENSITIES = [
    ("mdpi", 108, 48),
    ("hdpi", 162, 72),
    ("xhdpi", 216, 96),
    ("xxhdpi", 324, 144),
    ("xxxhdpi", 432, 192),
]

for density, fg_size, legacy_size in DENSITIES:
    mipmap_dir = os.path.join(ANDROID_RES, f"mipmap-{density}")
    os.makedirs(mipmap_dir, exist_ok=True)

    # 1. Foreground adaptive icon (108dp canvas with safe-zone ~67% = 72dp)
    # The inner icon should be 68% of the canvas to avoid clipping by circular masks
    fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    target_inner_size = int(fg_size * 0.68)
    scaled_icon = src.resize((target_inner_size, target_inner_size), Image.Resampling.LANCZOS)
    offset_x = (fg_size - target_inner_size) // 2
    offset_y = (fg_size - target_inner_size) // 2
    fg_canvas.paste(scaled_icon, (offset_x, offset_y), scaled_icon)
    fg_canvas.save(os.path.join(mipmap_dir, "ic_launcher_foreground.png"), "PNG")

    # 2. Legacy ic_launcher.png (White rounded rectangle background + icon)
    legacy_canvas = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
    # Draw rounded rectangle background
    draw = ImageDraw.Draw(legacy_canvas)
    radius = int(legacy_size * 0.2)
    # draw white rounded rect
    draw.rounded_rectangle([(0, 0), (legacy_size - 1, legacy_size - 1)], radius=radius, fill=(255, 255, 255, 255))
    # paste icon centered with 10% padding
    legacy_inner_size = int(legacy_size * 0.82)
    scaled_legacy_icon = src.resize((legacy_inner_size, legacy_inner_size), Image.Resampling.LANCZOS)
    l_off_x = (legacy_size - legacy_inner_size) // 2
    l_off_y = (legacy_size - legacy_inner_size) // 2
    legacy_canvas.paste(scaled_legacy_icon, (l_off_x, l_off_y), scaled_legacy_icon)
    legacy_canvas.save(os.path.join(mipmap_dir, "ic_launcher.png"), "PNG")

    # 3. Legacy ic_launcher_round.png (White circular background + icon)
    round_canvas = Image.new("RGBA", (legacy_size, legacy_size), (0, 0, 0, 0))
    draw_round = ImageDraw.Draw(round_canvas)
    draw_round.ellipse([(0, 0), (legacy_size - 1, legacy_size - 1)], fill=(255, 255, 255, 255))
    round_inner_size = int(legacy_size * 0.76)
    scaled_round_icon = src.resize((round_inner_size, round_inner_size), Image.Resampling.LANCZOS)
    r_off_x = (legacy_size - round_inner_size) // 2
    r_off_y = (legacy_size - round_inner_size) // 2
    round_canvas.paste(scaled_round_icon, (r_off_x, r_off_y), scaled_round_icon)
    round_canvas.save(os.path.join(mipmap_dir, "ic_launcher_round.png"), "PNG")

    print(f"Generated icons for mipmap-{density} (fg={fg_size}x{fg_size}, legacy={legacy_size}x{legacy_size})")

# 4. Splash screens
SPLASH_CONFIGS = [
    ("drawable", (480, 320)),
    ("drawable-land-hdpi", (800, 480)),
    ("drawable-land-mdpi", (480, 320)),
    ("drawable-land-xhdpi", (1280, 720)),
    ("drawable-land-xxhdpi", (1600, 960)),
    ("drawable-land-xxxhdpi", (1920, 1280)),
    ("drawable-port-hdpi", (480, 800)),
    ("drawable-port-mdpi", (320, 480)),
    ("drawable-port-xhdpi", (720, 1280)),
    ("drawable-port-xxhdpi", (960, 1600)),
    ("drawable-port-xxxhdpi", (1280, 1920)),
]

for folder, (w, h) in SPLASH_CONFIGS:
    splash_dir = os.path.join(ANDROID_RES, folder)
    os.makedirs(splash_dir, exist_ok=True)
    splash = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    
    # Logo size in splash: min dimension * 0.45
    min_dim = min(w, h)
    logo_size = int(min_dim * 0.45)
    splash_logo = src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    off_x = (w - logo_size) // 2
    off_y = (h - logo_size) // 2
    splash.paste(splash_logo, (off_x, off_y), splash_logo)
    splash.save(os.path.join(splash_dir, "splash.png"), "PNG")
    print(f"Generated splash for {folder} ({w}x{h}, logo={logo_size}x{logo_size})")

print("All Android & Web icons generated successfully!")
