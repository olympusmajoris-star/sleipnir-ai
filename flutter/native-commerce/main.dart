import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase/supabase.dart';
import 'public_config.dart';
import 'backend/supabase/supabase.dart';
import 'bridge.dart';
import 'custom_code/widgets/fast_casual.dart';
import 'custom_code/widgets/sit_down.dart';
import 'custom_code/widgets/fast_food.dart';
import 'custom_code/widgets/retail.dart';

class CatalogClient extends http.BaseClient {
  final transport=http.Client();
  // The original widgets use per-product lookups for modifiers and size choices.
  static const tables={'stores','products','store_categories','dayparts','store_board_panels','store_drive_thru_board','combo_meta','modifier_groups','modifier_options','product_modifier_groups','product_size_prices','product_sizes'};
  @override Future<http.StreamedResponse> send(http.BaseRequest req){
    final u=req.url;
    if(u.origin!=Uri.parse(supabaseUrl).origin || !{'HEAD','GET'}.contains(req.method) || !u.path.startsWith('/rest/v1/') || !tables.contains(u.path.substring(9)))return Future.error(StateError('Store preview uses read-only catalog data.'));
    final store=u.queryParameters['store_id'];
    if((store!=null && store!='eq.$nativeStore')||(u.path.endsWith('/stores')&&u.queryParameters['id']!='eq.$nativeStore'))return Future.error(StateError('Store changed.'));
    return transport.send(req);
  }
}
void main(){
  WidgetsFlutterBinding.ensureInitialized();nativeStore=(Uri.base.queryParameters['store']??'').toLowerCase();
  SupaFlow.client=SupabaseClient(supabaseUrl,supabaseKey,httpClient:CatalogClient());
  runApp(MaterialApp(debugShowCheckedModeBanner:false,theme:ThemeData.dark(),home:Shop()));
}
class Shop extends StatefulWidget {const Shop({super.key}); @override State<Shop> createState()=>_ShopState();}
class _ShopState extends State<Shop>{
 String renderer=''; String error=''; int panel=1;int maxPanel=1;
 late final StreamSubscription<html.Event> sub;
 @override void initState(){super.initState();sub=html.document.on['sleipnir-preview-down'].listen((e){if(e is! html.CustomEvent)return;final dynamic q=jsonDecode(e.detail);if(q is! Map)return;
   if(q['type']=='focus-product' && q['product_id'] is String)nativeItems[q['product_id']]?.call();
   if(q['type']=='set-mode')nativeEditing.value=q['mode']=='select';
   if(q['type']=='set-scale'||q['type']=='sync'){
     final values=q['type']=='sync'?q['scales']:{q['product_id']:q['scale']};if(values is! Map)return;
     final next=q['type']=='sync'?<String,double>{}:Map<String,double>.of(nativeScales.value);
     for(final pair in values.entries){if(pair.key is String && skuPattern.hasMatch(pair.key)&&pair.value is num && pair.value>=.1 && pair.value<=4){next[pair.key]=(pair.value as num).toDouble();}}
     nativeScales.value=next;
   }
   if(q['type']=='move'&&renderer=='fast_food')setState(()=>panel=(panel+(q['direction']=='next'?1:-1)).clamp(1,maxPanel));
 });load();}
 Future<void> load()async{try{
  if(!skuPattern.hasMatch(nativeStore))throw Exception();
  final store=await SupaFlow.client.from('stores').select('id,name,menu_type').eq('id',nativeStore).eq('is_live',true).single();
  final kind=store['menu_type'];
  final page=const {'retail':'retail','convenience':'retail','fast_casual':'fast_casual','sit_down':'sit_down','restaurant':'sit_down','fast_food':'fast_food','drive_thru':'fast_food'}[kind];
  if(page==null)throw StateError('This store has no supported native commerce route.');
  if(page=='fast_food'){
    final panels=await SupaFlow.client.from('store_board_panels').select('image_url').eq('store_id',nativeStore);
    final urls=panels.map((r)=>r['image_url']).whereType<String>().where((u)=>u.isNotEmpty).toSet();
    if(urls.isNotEmpty)maxPanel=urls.length;
  }
  if(!mounted)return;setState(()=>renderer=page);
  WidgetsBinding.instance.addPostFrameCallback((_)=>nativeEmit({'type':'ready','renderer':page,'store_name':store['name'],'panels':maxPanel}));
 }catch(e){if(mounted)setState(()=>error='The native storefront could not load its catalog.');nativeEmit({'type':'error','message':error});}}
 @override void dispose(){sub.cancel();super.dispose();}
 @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:renderer.isEmpty?Center(child:error.isEmpty?const CircularProgressIndicator():Text(error)):LayoutBuilder(builder:(ctx,box){
  final w=box.maxWidth,h=box.maxHeight;
  switch(renderer){
  case 'retail':return RetailStore(storeId:nativeStore,width:w,height:h);
  case 'fast_casual':return FastCasualMenuBoard(storeId:nativeStore,width:w,height:h);
  case 'sit_down':return SitDownRestaurantMenu(storeId:nativeStore,width:w,height:h);
  default:return McDonaldsComboPanel(key:ValueKey(panel),storeId:nativeStore,panelIndex:panel,width:w,height:h);
  }
 })));
}
