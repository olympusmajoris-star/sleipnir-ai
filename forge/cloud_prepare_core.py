"""Bounded cloud footage preparation. Inputs remain intact; output is animated RGBA WebP."""
import json
import math
import subprocess
from pathlib import Path

def cloud_recipe(settings):
    media = settings.get('media', settings)
    prep = settings.get('preparation', {})
    def number(value, default, low, high):
        value = default if value is None else value
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Invalid cloud preparation number')
        return max(low, min(high, value))
    start = number(media.get('in'), 0, 0, 36000)
    end = number(media.get('out'), start + 10, 0, 36000)
    if end <= start or end - start > 30:
        raise ValueError('Select a cloud slice longer than zero and no more than 30 seconds')
    crop = media.get('crop') or {}
    x = number(crop.get('x'), 0, 0, .95)
    y = number(crop.get('y'), 0, 0, .95)
    width = number(crop.get('width'), 1, .05, 1 - x)
    height = number(crop.get('height'), 1, .05, 1 - y)
    color = prep.get('keyColor', '#000000')
    if not isinstance(color, str) or len(color) != 7 or color[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in color[1:]):
        raise ValueError('Choose a six-digit key color')
    fps = int(number(prep.get('fps'), 8, 4, 10))
    brightness = number(media.get('brightness'), 1, .2, 2)
    contrast = number(media.get('contrast'), 1, .2, 2)
    saturation = number(media.get('saturation'), 1, 0, 2)
    # RGB brightness/contrast followed by the same luminance matrix as CSS saturate.
    curve = "'clip((val*%s-127.5)*%s+127.5,0,255)'" % (brightness, contrast)
    luma = [.213, .715, .072]
    channels = ['r', 'g', 'b']
    matrix = ':'.join(channels[row] + channels[col] + '=' + str(luma[col] * (1-saturation) + (saturation if row == col else 0))
                      for row in range(3) for col in range(3))
    filters = ['fps=' + str(fps),
               'crop=iw*%s:ih*%s:iw*%s:ih*%s' % (width, height, x, y),
               'format=rgba', 'lutrgb=r=%s:g=%s:b=%s' % (curve, curve, curve),
               'colorchannelmixer=' + matrix]
    if prep.get('removeBackground', True):
        filters.append('colorkey=0x%s:%s:%s' % (color[1:],
            number(prep.get('similarity'), .10, .01, .9), number(prep.get('softness'), .12, 0, .8)))
    filters.extend(['scale=640:426:force_original_aspect_ratio=decrease',
                    'pad=640:426:(ow-iw)/2:(oh-ih)/2:color=black@0', 'setsar=1'])
    return {'start': start, 'duration': end-start, 'fps': fps, 'filters': ','.join(filters),
            'pingpong': bool(prep.get('pingpong', True)),
            'quality': int(number(prep.get('quality'), 85, 50, 100))}

def cloud_command(ffmpeg, source, destination, settings):
    r = cloud_recipe(settings)
    filters = '[0:v]%s[v0];[v0]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]' % r['filters'] if r['pingpong'] else '[0:v]%s[v]' % r['filters']
    return [str(ffmpeg), '-nostdin', '-v', 'error', '-y', '-ss', str(r['start']), '-t', str(r['duration']), '-i', str(source),
            '-filter_complex', filters, '-map', '[v]', '-an', '-c:v', 'libwebp_anim', '-quality', str(r['quality']),
            '-loop', '0', '-vsync', '0', str(destination)]

def cloud_webp_info(path):
    data = Path(path).read_bytes()
    if len(data) < 20 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('Prepared output is not a WebP file')
    if int.from_bytes(data[4:8], 'little') + 8 != len(data):
        raise ValueError('Prepared cloud size is invalid')
    offset, frames, duration_ms = 12, 0, 0
    width, height = 0, 0
    while offset + 8 <= len(data):
        kind = data[offset:offset+4]
        size = int.from_bytes(data[offset+4:offset+8], 'little')
        body = data[offset+8:offset+8+size]
        if len(body) != size:
            raise ValueError('Prepared cloud is truncated')
        if kind == b'VP8X' and len(body) >= 10:
            width = 1 + int.from_bytes(body[4:7], 'little')
            height = 1 + int.from_bytes(body[7:10], 'little')
        if kind == b'ANMF' and len(body) >= 16:
            frames += 1
            duration_ms += int.from_bytes(body[12:15], 'little')
        offset += 8 + size + size % 2
    if frames < 2:
        raise ValueError('This slice contains no changing cloud frames; choose a moving cloud clip')
    if width != 640 or height != 426 or duration_ms <= 0 or frames > 600:
        raise ValueError('Prepared cloud dimensions, duration or frame count are invalid')
    return {'frames': frames, 'duration': duration_ms / 1000}

def prepare_cloud(source, destination, settings, ffmpeg='ffmpeg'):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if source == destination or not source.is_file() or source.stat().st_size > 250 * 1024 * 1024:
        raise ValueError('Choose a source clip under 250 MB and a separate output file')
    if destination.exists():
        raise ValueError('Output already exists; choose a new name')
    command = cloud_command(ffmpeg, source, destination, settings)
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=300)
        if not destination.is_file() or destination.stat().st_size > 25 * 1024 * 1024:
            raise ValueError('Cloud output exceeds 25 MB; shorten the slice or lower its quality')
        r = cloud_recipe(settings)
        animation = cloud_webp_info(destination)
        return {'width': 640, 'height': 426, 'fps': r['fps'], 'duration': animation['duration'], 'frames': animation['frames'],
                'alpha': 'keyed' if settings.get('preparation', {}).get('removeBackground', True) else 'source',
                'format': 'animated-webp', 'bytes': destination.stat().st_size, 'sourceUnchanged': True}
    except Exception:
        destination.unlink(missing_ok=True)
        raise

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--settings', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare_cloud(args.input, args.output, json.loads(Path(args.settings).read_text()))))
