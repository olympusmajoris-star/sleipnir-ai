import 'dart:convert';
import 'dart:html' as html;
import 'package:flutter/material.dart';

final nativeEditing = ValueNotifier<bool>(true);
final nativeScales = ValueNotifier<Map<String,double>>({});
final skuPattern = RegExp(r'^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$',caseSensitive:false);
String nativeStore = '';
void nativeEmit(Map<String,dynamic> event) => html.document.dispatchEvent(html.CustomEvent('sleipnir-preview-up',detail:jsonEncode({...event,'store_id':nativeStore})));
bool chooseSku(String id,{bool scalable=true}){
  if(!nativeEditing.value || !skuPattern.hasMatch(id))return false;
  nativeEmit({'type':'select','product_id':id,'scalable':scalable}); return true;
}
Widget scaleSku(String id, Widget child) => ValueListenableBuilder<Map<String,double>>(
  valueListenable:nativeScales,child:child,builder:(_,scales,photo){
    final factor=scales[id]??1;
    return factor==1?photo!:ClipRect(child:Transform.scale(scale:factor,child:photo));
  }
);

final nativeItems=<String,VoidCallback>{};
void nativeCatalog(Map<String,VoidCallback> items){
 nativeItems..clear()..addAll(items);
 nativeEmit({'type':'inventory','count':items.length,'first':items.keys.where(skuPattern.hasMatch).take(8).toList()});
}
