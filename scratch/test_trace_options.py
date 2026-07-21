import os
from PIL import Image

image_path = r"c:\techcontrol\Techcontrolv1-main\public\plantas\planta_padronizada.png"
if os.path.exists(image_path):
    img = Image.open(image_path)
    print(f"Image loaded: mode={img.mode}, size={img.size}")
else:
    print("Image not found:", image_path)
