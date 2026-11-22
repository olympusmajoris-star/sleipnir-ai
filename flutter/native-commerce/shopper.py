"""Produce private, self-contained FlutterFlow widgets from the recorded native originals."""
import argparse
import hashlib
import json
from pathlib import Path
from build import D, NAMES, surround
from menu import integrate as menu_integrate

METHODS = """
  Map<String, double> _studioProductScales = {};
  int _studioScaleRequest = 0;

  Future<void> _refreshStudioProductScales() async {
    final request = ++_studioScaleRequest;
    final store = __STORE__;
    _studioProductScales = {};
    if (!const <String>{__IDS__}.contains(store)) return;
    final next = <String,double>{};
    const batchSize = 500;
    try {
      for (var offset = 0;; offset += batchSize) {
        final rows = await SupaFlow.client.from('studio_grocery_product_scales')
            .select('product_id,scale').eq('store_id', store).order('product_id')
            .range(offset, offset + batchSize - 1);
        if (!mounted || request != _studioScaleRequest || store != __STORE__) return;
        for (final row in rows) {
          final key = row['product_id'];
          final scale = row['scale'];
          if (key is String && scale is num && scale >= .1 && scale <= 4) {
            next[key] = scale.toDouble();
          }
        }
        if (rows.length < batchSize) break;
      }
      if (mounted && request == _studioScaleRequest && store == __STORE__) {
        setState(() => _studioProductScales = next);
      }
    } catch (_) {
      // Older deployments can continue to use the widget's original image sizes.
    }
  }

  Widget _studioScaleSku(String id, Widget photo) {
    final factor = _studioProductScales[id] ?? 1.0;
    return factor == 1 ? photo : ClipRect(child: Transform.scale(scale: factor, child: photo));
  }
"""

def replace_one(text, before, after):
    if text.count(before) != 1:
        raise ValueError(f'Unexpected source location {before}')
    return text.replace(before, after)


def shopper(source, kind, ids):
    anchor = {
        'retail':'  Future<void> _loadStore() async {',
        'fast_casual':'  Future<void> _load() async {',
        'sit_down':'  Future<void> _load() async {',
        'fast_food':'  Future<PanelData> loadPanel() async {',
    }[kind]
    getter = {'fast_food':'activeStoreId','retail':"(widget.storeId ?? '').trim()"}.get(kind, 'widget.storeId.trim()')
    methods = METHODS.replace('__STORE__',getter).replace('__IDS__',','.join("'"+id+"'" for id in sorted(ids)))
    s = replace_one(source,anchor,methods+'\n'+anchor+'\n    _refreshStudioProductScales();')
    if kind == 'retail':
        if s.count('_image(item.imageUrl)') != 2: raise ValueError('Retail image slots changed')
        return s.replace('_image(item.imageUrl)', '_studioScaleSku(item.id, _image(item.imageUrl))')
    if kind == 'fast_food':
        return surround(s, r'Image\.network\(\s*popupImage', 'productForSize(popupSize??"sand")').replace('scaleSku(', '_studioScaleSku(')
    s = surround(s, r'Image\.network\(\s*item.imageUrl!')
    if kind == 'fast_casual': s = surround(s,r'Image\.network\(\s*heroImageUrl')
    return s.replace('scaleSku(', '_studioScaleSku(')


def main():
    ap=argparse.ArgumentParser()
    for name in ('originals','scope','out'):ap.add_argument('--'+name,required=True,type=Path)
    a=ap.parse_args()
    inventory=json.loads((D.parent.parent/'native-source-inventory.json').read_text())
    baseline={r['widgets'][0]:r['sha256'] for r in inventory['sources']}
    scopes=json.loads(a.scope.read_text())
    a.out.mkdir(parents=True,exist_ok=True)
    records=[]
    for kind,widget in NAMES.items():
        raw=(a.originals/(widget+'.dart')).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=baseline[widget]:raise ValueError('Unrecorded source for '+widget)
        ids=[r['id'] for r in scopes if r['menu_type']==kind and r['category']!='Grocery']
        if not ids:raise ValueError('Missing verified app locations for '+kind)
        out=menu_integrate(shopper(raw.decode(),kind,ids),kind,False).encode();path=a.out/(widget+'.dart');path.write_bytes(out)
        records.append({'widget':widget,'file':path.name,'sha256':hashlib.sha256(out).hexdigest(),'baseline_sha256':baseline[widget],'baseline_inventory_date':inventory['receivedAt'],'app_store_ids':sorted(ids)})
    (a.out/'manifest.json').write_text(json.dumps(records,indent=2))
if __name__=='__main__':main()
