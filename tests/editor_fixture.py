"""Intercept the editor's browser requests. All owner writes terminate in this fixture."""
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT if (ROOT/'studio-jobs.js').is_file() else ROOT.parent / 'site'
SHA = '9e' * 32
LEGACY_SHA = 'bf' * 32
TARGET = '35ef70d0-3d20-4599-96a3-648ee3c7c340'
FIRST = '11111111-1111-4111-8111-111111111111'
SECOND = '22222222-2222-4222-8222-222222222222'
PUBLIX = '189581c9-d728-4e5d-9e02-ae4de19a15af'
PUBLIX_SKU = '814a7e25-2055-4cc0-8c9d-bb1bf0fb0315'
PUBLIX_RECORD = ('3 Musketeers Candy Milk Chocolate Bar Full Size',1.97)
ALDI = 'e5a01340-424a-4a41-b0e6-99cb9e944733'
DOLLAR = '0600cb61-45f9-402b-a209-134abdaef10f'
BUNNELL = 'fea775c8-8612-4f2e-bfc6-70d8e6ace6be'
WALMART = '03dbd8fa-ed64-4236-85be-206c952da024'
SPROUTS = '51c3a671-26ba-4d66-9716-de34f393eef7'
OTHER = '2b145836-6d20-43dc-b01e-373c88c5aead'
UNLISTED = '8c4c00e6-c48d-41fe-b058-0f4a89f7c4e1'
SAMPLES = {
    ALDI: ('ALDI (Palm Coast Pkwy)','Grocery','grocery','Alcohol','87d4eb1b-1325-4238-9262-ccf4cc40bf1e','Connellys Original Country Cream',9.09),
    DOLLAR: ('Dollar General (#1350)','Retail','retail','Apparel & Accessories','f70a0f97-0d18-43a0-12d0-8df915617068','Beaver Hunter Straight Bourbon Whiskey Trucker Hat',10.75),
    BUNNELL: ('Dollar General Market (Bunnell)','Grocery','retail','$2 Food Items','59f79755-9834-4395-b790-d34cc011f47e','5TH Avenue Rich Chocolate Coated Crunchy Peanut Butter Candy Bar, 2 oz',1.75),
    WALMART: ('Walmart Supercenter','Grocery','retail','Automotive','16dcc9bf-49a3-4cd4-8dcc-721c047c91b2','Armor All Carpet & Upholstery Cleaner',5.47),
    SPROUTS: ('Sprouts Farmers Market','Grocery','grocery','Alcohol','de81d983-7845-4aa2-b8fa-5378a6c67fe1','19 Crimes Cali Red',12.99),
}
PRICES = {FIRST: ('Good & Gather Black Beans', .99), SECOND: ('Good & Gather Garbanzo Beans', 1.29)}
ORIGIN = 'https://studio.test'
PAGE = ORIGIN + '/grocery-aisle-editor.html'
FILENAME = 'GroceryAisle_Approved.dart'

JOBS_TEMPLATE = """
window.StudioJobs = {
 current:()=>window.mockConnected ? {user:{id:'owner-fixture'}} : null,
 connect:async()=>{window.mockConnected=true;return window.StudioJobs.current()},
 request:async(path,{method='GET',body,headers={}}={})=>{
   const r=await fetch(new URL(path, location.origin), {
    method, headers:{'content-type':'application/json',...headers},body:body==null ? undefined : JSON.stringify(body)});
   const data=await r.json();
   if(!r.ok)throw new Error(data.message || String(r.status));
   return data;
 }
};
"""


class Fixture:
    def __init__(self, *, signed_in=True, authorized=True, store=TARGET):
        self.store=store
        self.signed_in = signed_in
        self.authorized = authorized
        self.calls = []
        self.scales = {}
        self.flags = []
        self.failures = []
        self.versions = [self.version(SHA, 'ready')]

    @staticmethod
    def version(digest, status):
        return {'id':digest[:8]+'-1111-4111-8111-111111111111', 'sha256':digest,
                'filename':FILENAME,'byte_size':16384,'created_at':'2026-11-22T02:00:00Z',
                'preview_status':status,'preview_sha256':digest if status=='ready' else None,
                'preview_url':f'aisle-preview/{digest}/index.html' if status=='ready' else None}

    def serve(self, route):
        req=route.request
        url=urlparse(req.url)
        path=url.path
        basename=path.rsplit('/',1)[-1]
        if url.hostname=='127.0.0.1' and url.port==48179 and path=='/health':
            return route.fulfill(json={'paired':False},headers={'access-control-allow-origin':'*'})
        if url.hostname != 'studio.test':
            return route.fulfill(status=404,body='Outside fixture')
        if path.endswith('/aisle-preview/manifest.json'):
            versions = {}
            for digest in [SHA, LEGACY_SHA]:
                versions[digest] = {'path':f'{digest}/index.html','artifactSha256':'af'*32,'filename':FILENAME,
                    'default':digest==SHA,'aisleRouting':{'standard':['Snacks','Canned Goods & Soups','Condiments & Sauces','Dairy & Eggs','Baby','Bread & Rolls'],
                    'targetStoreId':TARGET,'dynamicStoreIds':[TARGET,ALDI,DOLLAR],
                    'otherStores':'catalog' if digest==SHA else 'standard','dollarGeneralByName':digest==SHA,'editableStoreIds':None if digest==SHA else [PUBLIX,TARGET]}}
            return route.fulfill(json={'versions':versions})
        if path.endswith(tuple(f'/aisle-preview/{digest}/index.html' for digest in [SHA,LEGACY_SHA])):
            return route.fulfill(path=ROOT/'tests'/'preview-fixture.html',content_type='text/html')
        if basename=='workspace-core.js':
            return route.fulfill(path=SITE/basename,content_type='text/javascript')
        if basename=='store-scope.json':
            return route.fulfill(path=SITE/basename,content_type='application/json')
        if basename=='store-directory.html':
            return route.fulfill(content_type='text/html',body='<h1>Stores</h1>')
        if basename=='grocery-private-build.js':
            return route.fulfill(path=SITE/basename,content_type='text/javascript')
        if basename=='studio-jobs.js':
            return route.fulfill(content_type='text/javascript',
                body=f'window.mockConnected={str(self.signed_in).lower()};'+JOBS_TEMPLATE)
        if basename=='studio-transfer-config.js':
            return route.fulfill(content_type='text/javascript',
                body="window.StudioTransferConfig={url:location.origin,key:'local-fixture-only'};")
        if basename=='studio-auth-core.js':
            return route.fulfill(content_type='text/javascript',body='/* owner supplied by fixture */')
        if basename.startswith('shelf-layout-') and basename.endswith(('.js','.css')):
            return route.fulfill(path=SITE/basename,content_type='text/javascript' if basename.endswith('.js') else 'text/css')
        if basename in ('grocery-aisle-editor.html','aisle-shelf-editor.css','aisle-shelf-editor.js'):
            file=ROOT/basename
            mime={'.html':'text/html','.css':'text/css','.js':'text/javascript'}[file.suffix]
            return route.fulfill(path=file,content_type=mime)
        if '/rest/v1/' in path:
            body=req.post_data_json if req.post_data else None
            self.calls.append((req.method,basename,parse_qs(url.query),body))
            if basename=='studio_palm_coast_street_menu_counts_v':
                return route.fulfill(json=[])
            if basename=='stores':
                sid=parse_qs(url.query).get('id',[''])[0].removeprefix('eq.')
                meta = SAMPLES.get(sid) or {PUBLIX:('Publix (Island Walk)','Grocery','grocery'),TARGET:('Target','Grocery','retail'),OTHER:('Sample restaurant','Restaurant','fast_food')}.get(sid)
                return route.fulfill(json=[] if not meta else [{'id':sid,'name':meta[0],'category':meta[1],'menu_type':meta[2],'is_live':True}])
            if basename=='studio_palm_coast_editor_locations':
                ids=parse_qs(url.query)['p_store_ids'][0].strip('{}').split(',')
                rows=[]
                for sid in ids:
                    meta=SAMPLES.get(sid) or {PUBLIX:('Publix (Island Walk)','Grocery','grocery'),
                        TARGET:('Target','Grocery','retail'),OTHER:("McDonald's",'Restaurant','fast_food')}.get(sid)
                    if meta and sid not in (BUNNELL,DOLLAR,SPROUTS):
                        city='Palm Coast'
                        rows.append({'id':sid,'name':meta[0],'category':meta[1],'menu_type':meta[2],'is_live':True,
                            'address':f'123 Main St, {city}, FL 32164','product_count':200,'image_count':180,
                            'app_surface':'ordinary','native_renderer':None,'valhalla_menu_count':0,'is_valhalla':False})
                return route.fulfill(json=rows)
            if basename=='studio_grocery_shelf_layout':
                return route.fulfill(json={'revision':0,'layout':None})
            if basename=='studio_grocery_aisles':
                return route.fulfill(json=[])
            if basename=='studio_product_categories':
                source = SAMPLES.get(self.store)
                categories = ('Snacks',source[3]) if source else ('Snacks','Produce','Bakery')
                return route.fulfill(json=[{'category':a,'product_count':12} for a in categories])
            if basename=='target_catalog_categories':
                return route.fulfill(json=[{'category':a,'product_count':12} for a in
                    ('Canned Goods & Soups','Condiments & Sauces','Dairy & Eggs','Baby')])
            if basename=='products':
                q=parse_qs(url.query);pid=q.get('id',[''])[0].removeprefix('eq.')
                catalog={PUBLIX_SKU:PUBLIX_RECORD} if self.store==PUBLIX else PRICES
                sample=SAMPLES.get(self.store)
                if sample: catalog={sample[4]:(sample[5],sample[6])}
                if q.get('store_id')!=[f'eq.{self.store}'] or pid not in catalog:
                    return route.fulfill(json=[])
                name,price=catalog[pid]
                return route.fulfill(json=[{'id':pid,'name':name,'price':price,'store_id':self.store,'category':sample[3] if sample else 'Snacks' if self.store==PUBLIX else 'Canned Goods & Soups','shelf_group':'Other'}])
            if basename=='studio_grocery_editor_access':
                return route.fulfill(json=self.authorized)
            if basename=='studio_grocery_dart_versions':
                return route.fulfill(json=self.versions)
            if basename=='studio_grocery_product_scales':
                rows=list(self.scales.values());filters=parse_qs(url.query)
                if 'product_id' in filters:
                    rows=[r for r in rows if filters['product_id']==['eq.'+r['product_id']]]
                return route.fulfill(json=rows)
            if basename=='studio_grocery_product_flags':
                return route.fulfill(json=self.flags)
            if not self.authorized:
                return route.fulfill(status=403,json={'message':'Owner access required'})
            if basename=='studio_save_grocery_product_scale':
                pid=body['p_product_id'];previous=self.scales.get(pid,{}).get('revision',0)
                if body['p_expected_revision']!=previous:
                    return route.fulfill(status=409,json={'message':'Scale revision has changed'})
                row={'store_id':body['p_store_id'],'product_id':pid,'scale':body['p_scale'],'revision':previous+1}
                self.scales[pid]=row
                return route.fulfill(json=row)
            if basename=='studio_flag_grocery_product':
                row={'id':'33333333-3333-4333-8333-333333333333','product_id':body['p_product_id'],
                     'aisle':body['p_aisle'],'store_id':body['p_store_id'],'version':body['p_version'],
                     'page_key':body['p_page_key'],'note':body['p_note'],'status':'open',
                     'created_at':'2026-11-22T02:30:00Z'}
                self.flags.insert(0,row)
                return route.fulfill(json=row)
            if basename=='studio_register_grocery_dart':
                digest=sha256(body['p_source'].encode()).hexdigest();row=self.version(digest,'pending')
                row['filename']=body['p_filename'];row['byte_size']=len(body['p_source'].encode())
                self.versions.insert(0,row)
                return route.fulfill(json=row)
            self.failures.append((req.method,path))
            return route.fulfill(status=404,json={'message':'Unknown service in editor fixture'})
        if basename in ('favicon.ico','manifest.webmanifest'):
            return route.fulfill(status=204,body='')
        return route.fulfill(status=404,body='Unknown fixture route')
