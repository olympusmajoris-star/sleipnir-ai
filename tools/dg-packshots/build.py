"""Bake individual WebP product photos. Usage: build.py catalog.json raw_directory output_directory. Requires Pillow and Node."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from threading import local
import argparse, io, json, os, struct, subprocess, sys
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
context = local()
# These two vendor photographs fill the full width with square GE cartons, but
# add a white strip above and below. Preserve the actual white carton faces.
letterboxed_cartons = {
    'https://s7d1.scene7.com/is/image/dolgen/dg-19871201-1',
    'https://s7d1.scene7.com/is/image/dolgen/dg-01156101-1'
}
def render(row, photos, output):
    if not hasattr(context, 'worker'):
        context.worker = subprocess.Popen(['node', str(HERE/'worker.cjs')], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    worker = context.worker
    with Image.open(photos/(row['id']+'.src')) as frame:
        frame = ImageOps.exif_transpose(frame).convert('RGBA')
        frame.thumbnail((600,600),Image.Resampling.LANCZOS)
        if row['image_url'] in letterboxed_cartons and frame.width < frame.height:
            top=(frame.height-frame.width)//2
            frame=frame.crop((0,top,frame.width,top+frame.width))
        width, height = frame.size
        worker.stdin.write(struct.pack('<2I',width,height)+frame.tobytes())
        worker.stdin.flush()
        x,y,w,h,cutout = struct.unpack('<5I',worker.stdout.read(20))
        pixels = worker.stdout.read(width*height*4)
        photo = Image.frombytes('RGBA',(width,height),pixels).crop((x,y,x+w,y+h))
        if not photo.getbbox():
            raise ValueError('No visible product pixels')
        photo.thumbnail((430,430),Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        photo.save(encoded,'WEBP',quality=91,method=4,exact=True)
        content = encoded.getvalue()
        digest = sha256(content).hexdigest()
        image = output/'files'/(digest+'.webp')
        if not image.is_file():
            tmp=image.with_suffix('.'+row['id']+'.tmp')
            tmp.write_bytes(content);tmp.replace(image)
        return [row['id'],row['image_url'],digest,*photo.size,bool(cutout)]

def run(rows,photos,output):
    (output/'files').mkdir(parents=True,exist_ok=True)
    (output/'receipts').mkdir(exist_ok=True)
    def make(row):
        receipt = output/'receipts'/(row['id']+'.json')
        try:
            record = render(row,photos,output)
            temp=receipt.with_suffix('.tmp')
            temp.write_text(json.dumps(record,separators=(',',':')));temp.replace(receipt)
        except (OSError, ValueError) as e: return row['id'],str(e)
    with ThreadPoolExecutor(max_workers=min(6,os.cpu_count() or 1)) as pool:
        return [error for error in pool.map(make,rows) if error]

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalog',type=Path); parser.add_argument('photos',type=Path); parser.add_argument('out',type=Path)
    args=parser.parse_args()
    rows=json.loads(args.catalog.read_text())
    errors=run(rows,args.photos,args.out)
    print(f'{len(rows)-len(errors)} product photos rendered, {len(errors)} errors.')
    for failure in errors: print(*failure,file=sys.stderr)
    if errors: sys.exit(1)
