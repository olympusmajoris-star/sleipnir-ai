"""Build the small per-aisle metadata files after the corresponding product images have been published."""
import argparse,json,re
from pathlib import Path
def build(catalog,receipts,published,output):
    output.mkdir(parents=True,exist_ok=True)
    indexes={}
    for row in json.loads(catalog.read_text()):
        records=indexes.setdefault(row['category'],{})
        receipt=receipts/(row['id']+'.json')
        if not receipt.is_file():continue
        sku,source,digest,width,height,_=json.loads(receipt.read_text())
        if source!=row['image_url'] or not (published/digest).is_file():continue
        records[sku]=[source.removeprefix('https://s7d1.scene7.com/is/image/dolgen/'),digest,width,height]
    for category,records in indexes.items():
        slug=re.sub(r'[^a-z0-9]+','-',category.lower()).strip('-')
        (output/(slug+'.json')).write_text(json.dumps(records,separators=(',',':'))+'\n')
    print(sum(map(len,indexes.values())),'published product records across',len(indexes),'departments')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['catalog','receipts','published','output']:parser.add_argument(name,type=Path)
    args=parser.parse_args();build(args.catalog,args.receipts,args.published,args.output)
