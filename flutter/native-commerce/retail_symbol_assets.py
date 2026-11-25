"""Bake the Studio product-type SVGs into tintable, offline Flutter icons."""
import base64
import io
import json
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


def dart_symbol_map():
    sprite = Path(__file__).resolve().parents[2] / 'retail-type-symbols.svg'
    ns = 'http://www.w3.org/2000/svg'
    symbols = ET.parse(sprite).getroot().findall(f'{{{ns}}}symbol')
    tile = 72
    sheet = ET.Element(f'{{{ns}}}svg', {
        'width': str(tile * len(symbols)), 'height': str(tile),
        'viewBox': f'0 0 {24 * len(symbols)} 24',
        'fill': 'none', 'stroke': '#192f47', 'stroke-width': '1.65',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    })
    for index, symbol in enumerate(symbols):
        cell = ET.SubElement(sheet, f'{{{ns}}}svg', {
            'x': str(index * 24), 'width': '24', 'height': '24',
            'viewBox': symbol.attrib['viewBox'],
        })
        cell.extend(symbol)

    rendered = subprocess.run(
        ['inkscape', '--pipe', '--export-type=png', '--export-filename=-'],
        input=ET.tostring(sheet), capture_output=True, check=True,
    )
    alpha = Image.open(io.BytesIO(rendered.stdout)).convert('RGBA').getchannel('A')
    encoded = {}
    for index, symbol in enumerate(symbols):
        key = symbol.attrib['id']
        mask = alpha.crop((index * tile, 0, (index + 1) * tile, tile))
        if not mask.getbbox() or key in encoded:
            raise ValueError(f'Invalid retail symbol: {key}')
        icon = Image.new('LA', (tile, tile), (32, 0))
        icon.putalpha(mask)
        out = io.BytesIO()
        icon.save(out, format='PNG', optimize=True)
        encoded[key] = base64.b64encode(out.getvalue()).decode('ascii')
    return json.dumps(encoded, indent=2)
