/* Shelf layout uses the same store stock list as the aisle editor. */
(() => {
  'use strict';

  const dollarGeneralStores = new Set(['0600cb61-45f9-402b-a209-134abdaef10f','fea775c8-8612-4f2e-bfc6-70d8e6ace6be']);
  const dgPhysicalOnly=new Set(["00e531b2-0270-4681-b00a-3e961fb9e079", "012f3470-0a1e-458c-bb1c-949c79e5b54c", "0258cff6-d7a5-43c5-a7f6-1c40e1421b06", "02b4973b-720f-5422-bff6-9dd4f1e7b9a5", "034119c8-3395-45d6-b174-9e667cf4b283", "043da729-e7ef-f1cf-5f8e-bb567bde2d4c", "06254122-5e16-4871-8852-15f11971b715", "0642183f-48ff-418b-a312-8525ce9ae3c2", "080620aa-18c6-4f0d-a892-8224efe13811", "0c65f343-7f07-9421-28ed-c7a8c4122108", "0e4fa852-801d-4ea1-a670-6a849273e499", "0ea0dd05-ae16-4b7f-94ed-2dc3091c907d", "100f5863-eda9-4a34-8b31-616aba75928c", "104b732d-a892-1cef-7337-596c979dd26f", "105c8b91-3a8b-4dfa-9b9c-c9c4e0c360af", "10a8387f-44cf-4300-9448-b0370f4c24f1", "14333b4d-a14d-82be-2867-bb92ab0c5390", "145fd76f-9f91-4434-bd15-789ae6798598", "1480ef9b-ade1-fc4c-da9a-3edbd87e1a5c", "14a5f615-16a7-4423-b1c9-2070043c6c2b", "15f2f621-a325-4dbf-b3df-9790c3de0676", "17c9b58b-96a4-4560-950a-e2eb455abc75", "18bb264b-2bc0-472d-b8b1-191efb9dd790", "18d39627-f50e-4914-a0c2-500346c64d1a", "197fb7b8-b25f-4ca2-a99c-344f3ff105a2", "1dc46427-f37d-4a49-9bd7-70fead33c80a", "1f1751cc-b7a6-44cb-b4f1-4a186b499162", "20ec4190-657a-3db0-3731-8221e295e1eb", "22cf1ddf-d835-d853-66d3-fed66308f638", "233a67e7-8b5e-7991-a2a5-50aa477f219b", "23da63e4-a42c-4dce-b32f-6311f144d4c4", "2493c9ae-1510-4f67-a231-3d197a322105", "249fbd0a-2f10-48f4-b689-6897cfef2e66", "24bbd807-cff5-43ff-8d5c-c8e98cacbef7", "2588826f-b600-4b53-a8d6-ee75431bd8b0", "26399cd3-dd24-98c9-1b0b-baf26716da2f", "266101e1-7529-4813-a4e3-cebec9715424", "283bdd56-5a66-4655-9361-d8d405cb12b4", "285a018d-fb18-4856-b0d9-b382a99ca326", "286a3370-2b89-4d1c-b6cb-74a9b44d4a6a", "2ac4465b-9bf6-447f-9e18-d56adb983535", "2b7e797f-a6c7-4024-a75d-490bbf023f78", "2c129277-447b-4040-acf2-01b7f131abf9", "2cd18444-795c-0250-1f31-ae5b205f0b20", "2d58e533-f5ce-2bf1-7107-0dd9c38e86b8", "2e6d0c4d-48f4-48da-8211-820158f78f46", "2fa8e28a-b6b1-45d1-a90a-20999abdbe3c", "30678a77-6794-155d-ac59-68bbefeb1283", "316d6ea6-2a1e-49ce-9f26-cf2af8214b6f", "320344ae-cbc4-5130-1c20-82045974a765", "32449c37-2476-4c02-9d1b-2854958410b3", "32d0f6cf-8138-74f7-08f9-e542d896f895", "33512403-558c-49c7-84c6-0e9027ad0346", "347e486e-41e8-4982-8f7d-0747c5e23e25", "35665bf4-9780-b3c9-56cc-511d49f4af3d", "35680b7e-5c85-48e1-a296-762d3e64c947", "35ebbda1-69a8-46fd-e762-8cf8999e8f6a", "37115f74-8737-4e8d-bb1f-a5f2d8a15cea", "3748f6ea-f22f-4e9d-94d9-743d0bcee45f", "3834970c-51c3-bf1f-97e8-fa7290601600", "39c4ad45-2bc1-4f37-8d4b-a3f793727155", "3a79f149-1041-4b33-a51b-73cdcbcee2b8", "3b4a0856-4376-42eb-a6fc-ff46d806e2e7", "3fdfd0c8-d0de-2e1a-1856-9f5cffca65bd", "4119270a-2171-d245-f3d0-8cf6c20f8f38", "4179802b-b667-4a04-a56e-11acec573b44", "42b41e90-e1d8-4954-b497-a93604397593", "433f1149-5db3-45b9-9fba-3b7ad92f74ca", "436975cc-a6c0-4f70-a39d-b671838b678d", "439cc78c-9e64-ffb0-ba99-cc42a54499ba", "445d5fbb-e776-45fe-899c-552283c8be42", "447628dc-517b-4206-b8b8-ec87d7ec1bd0", "44907a8c-016a-470d-8186-093aa8963ed4", "449b2208-f4dc-44af-ba25-482fe7fcc572", "450092f4-22e9-4a18-b6d6-0945d5b149fa", "475fea57-9443-4e6a-95ee-dda473f83f78", "47ed69ba-3773-0c61-9c5c-6e5bf8c7d020", "494d308f-0a16-c3d8-1105-afb2c24ac493", "49a64a58-bbee-4213-b78d-96192f4dc9b6", "4a416a5c-58fe-4943-bda6-1e0547aa391b", "4abdc0fc-d16e-411c-8ac2-63eabe20aad0", "4b38250d-f1ed-43e9-b86f-b5eef7d78981", "4c66bc47-6507-42a0-9de4-788a1b6e52be", "4e72455f-6700-b99d-cacf-c5c0a8422b3a", "4fce8001-4b72-8911-59a6-1eb64bf30f70", "507e0a22-85ac-4486-844e-d32d66179a46", "5133faf7-2b43-70cc-287b-283da968fc11", "51a730c0-b7fb-429a-a940-b9250f5a07f7", "52212c37-b85d-4a45-841c-985d2b925c6b", "53a1881a-0703-40f5-bc90-6b8a4af8ec35", "546667f5-accf-433f-b00e-10614fe92d4e", "55a0a577-4fd5-4a59-ae74-4b90f82bd8f4", "574ef623-ae88-cb57-5a54-4fdc546380b7", "575d9878-5b59-7831-9ef2-6a60054f28b8", "57f4cf71-9ce1-03c4-c1e5-bf501a9bd4d6", "586876af-c6e6-4c5b-b6a1-8e5ee0d9d5f2", "58aaa08e-33e8-47be-8ab0-d70e7b933b1f", "596489a7-e3e0-3389-dd93-e1e037fcbe36", "5a54adb9-c880-0ded-90b4-55e061c87a6c", "5a7c8c15-f42c-ab2a-4c3e-c7a81c91f6df", "5acbaf86-4603-4eda-8898-7854865e009d", "5b14fb07-2dc8-d06f-2242-3c70981324f1", "5b2fc6e8-dbca-468e-ac10-1299e0c283dd", "5b5474f6-55dc-4fe6-ab8b-71ff14ff3e0e", "5b6a6dc3-8279-486b-80a5-3070bbb5987d", "5d3c7183-c699-492e-a519-5fc892a6003e", "5d9f1094-5c0a-40c6-bf44-a88aa141d6ed", "5dff7633-3745-40be-be43-f51830ff47e5", "5ec0a98e-2c01-4061-9c84-e57c4fa7be8e", "5f93e721-71da-4319-a5ff-d3dbe2f993ad", "60002e43-ad53-4cbd-8b54-1d7318de9a00", "628c3f6d-0b05-00a8-9c67-474935ce7f1a", "649fac24-d48f-4242-952f-7449d3c6928a", "64cc68d9-6fd9-4490-bd92-fc50260a2fc3", "6556842a-63f0-4545-92fb-c74594018453", "661bb712-c1ae-4416-918b-610a306bc2d8", "664906fe-6555-41e3-bab0-ab76c2d6d570", "688b23b6-d7e3-4a44-8a8b-9dffe923af1c", "68a545b5-e85e-4a2e-86b8-44c040f8d89f", "68b24127-bc46-457a-a751-48331f579a38", "6a304fcd-5cca-4b6b-8e04-d4521b135884", "6c485c2c-e904-4622-a7be-f94ad949ddac", "6c93ca1c-edf2-b87c-94a7-c790456305a6", "6cb86106-2f21-4bc0-93f3-57df83a0ae45", "6d291d50-3419-305c-b7a3-250a1f2d2989", "6d9d1682-b2f7-ae13-2e0a-9881d5f1acda", "6e89ff3f-1eca-4208-a5c7-6cd8d65562cc", "6ecb64e5-c051-437b-ade9-9aef450313c8", "6edd5766-6c7c-4bd8-8202-6bbd9dc1133f", "6fb937c8-4fcd-479b-bebb-8b51d4d7c8db", "70d5d55a-407f-aca8-59e2-1b5c045bc2d2", "71798d54-db33-77da-9710-ad36c96025f5", "7279c5ce-66c4-4085-adc0-4a010edfead4", "73f90ca9-ef1d-4638-abae-d27cf629750c", "75d7411b-5494-4428-9a4a-dd6fe8e891bd", "7676585e-ce7d-457d-8f17-d7a877d850c2", "77d02552-9e15-43ac-8f16-248faf6ded52", "788bb58b-610a-dee2-4f7a-5457c66052e1", "7919fabb-affb-3006-712a-3b32003693c3", "79679a53-74a3-49e0-b291-cb50fa127c08", "7a623ecf-021d-4870-8207-b9f21cce9bac", "7aa302ef-e761-d817-c922-066877ff312b", "7b35bd47-960e-9841-a6bf-6f9aada76fb2", "7b4fdc45-202f-d211-8202-635770ebc788", "7cfb6ac6-9b80-4728-bf0c-b6b8cdf0eaba", "7d8632f2-490f-43d4-8d6a-0b235747e578", "7e47ddb6-25e8-42e2-8f0e-c19a327199c0", "7f1b19b9-13cc-4dc9-853b-e3ac4e5cbe69", "7f5147cc-243f-9a15-c0c7-5f2fa4974f50", "817e6f4f-50b2-4046-b7e8-16bffacf4a8d", "81d83c9f-7285-4557-abf2-c461b8011e6b", "84a5df30-f9ca-42d5-9e0c-f739a482160a", "84a72ada-cf9e-4778-a341-a368dae7c6e8", "85520acb-9955-4e26-ac9e-855346be7665", "860d84fb-f2ea-92d6-1c8f-3ecf14309e95", "864081ec-ee23-4adb-90af-5e4f277f6699", "87bc4a46-ea49-4a53-42cc-2efe34308b96", "8852910e-fe9b-ffc6-c6ae-770c1404a887", "8a25b741-b245-4cc6-a064-f61edb25a468", "8a45d4ad-1e77-48fa-8442-616335acb149", "8a67abf8-f9f2-4f14-8696-d3b0f0ad6386", "8a808714-5bf0-4b7b-b736-4f658c49c481", "8b2f7fb6-2d39-421b-ae8d-1a144b516f24", "8b40af97-a94b-422c-a39d-26f98d49d40b", "8b420bec-1b72-888c-2fde-d4516db2d7dc", "8bc85d06-f4f8-465d-9fbc-72a9a675d752", "8bf2958e-648f-d1be-0c70-6de47b50bd87", "8c49485b-6882-df85-d106-27553a11914c", "8c6e95d9-f56d-c44f-ee4f-6cd3a5ad6ae3", "8c81adb9-05fb-425a-bdf9-46a2eae0de04", "8cd10f37-d9b0-5863-dcb8-4f79a05e7267", "8d483d5d-9acb-3f3e-6771-c90a0820701d", "8d6ba2ad-d40f-48a2-a57d-5ab39b8b10a9", "8f9e36e2-e7a5-4e16-ac9d-3feed738a7f7", "900b7643-8553-f48b-849e-f4ee7d35ed28", "900dfc73-87a3-4315-a44f-f8ee4e0d9b72", "901d5422-ea90-4756-91db-4f5a049cf585", "924b95d7-65c2-75f2-2c65-c4ba0fed6409", "9269b978-3d75-59cf-c677-272bc3e7f521", "954bcc02-cf15-482a-8bfb-10be105dffc4", "958cd4bb-7ccc-4dce-942d-0d882c7a887e", "98fd5a13-f0cd-472a-8b16-b7cdcdc3d149", "9984e80d-5b32-4118-ad3d-15aa79115345", "99f4f7b2-3771-4e34-bf23-17500bda2741", "9c80a732-0018-71e7-9c31-169e8a956b15", "9f1b3fef-1e7c-4127-a469-230dc75796d1", "9f2c08dd-8e2d-4ccf-a96a-f89babc24117", "9f84cfa7-f7b6-3de7-0555-e7660b5c9d4e", "a3298a3e-c72f-4a56-a9be-c7df9893459c", "a3c41e2f-8785-2bf3-404a-1caaa4939106", "a738a421-65e7-49ce-9bfb-d733e9b86aec", "a7912f9b-adfb-4fe6-b9d5-ab1f1c8abbca", "a7dab480-784e-455a-ace3-af2bdda1f05e", "a809452a-1602-480e-aa6b-fd3836026261", "a91d26b7-39f3-40e3-8b7d-a57bd50a930c", "a99507c8-ee4b-cae3-eb07-a22ecfff86a6", "aa010965-7302-416f-aa04-765dd6d7538b", "abe5f463-9d99-4f12-97d0-6b48bb18a810", "acc24907-f4df-4789-8eba-89a84d2a168e", "ae037498-4877-4556-ac77-08e3931475dc", "ae92b9f8-6ee8-22a1-fa4b-69e171278be8", "af102bbc-3a51-472f-92c8-cd8aa9a7f163", "afdb3431-bf83-09ab-764b-85bf57176f04", "afe32588-286a-1e8c-f835-f27c05265860", "b059dcc9-54a1-4314-940f-2c7c3c03dc9d", "b3cbe325-7732-2067-7b05-e602b5934e4f", "b3e18f31-7ad6-450a-8c35-371f0eb218fb", "b3fe0b65-b44c-4686-bf0c-d63afe3013f9", "b406027c-d7ee-4977-966a-c36537553de1", "b64ac037-90ec-9839-3904-c501589106a5", "b7ef8967-95c8-4e6d-beb8-40c0846684a7", "b912ba7f-3097-473f-8d1b-d956f4c8f558", "bc36aae8-b0ee-426c-8e58-b85f6598b7cf", "bce02f4a-4de5-444d-a3e8-3082c9ec354d", "bd1fd76a-acde-4079-bb23-6b0617bfbc2a", "bdffefe4-a75f-4518-8673-b04ca734928e", "bf5344f6-bbd5-46b4-aa95-e646260988bc", "c21d3c7e-8e1e-f94e-cee5-976c918c1679", "c28fca86-1c2f-4fff-837a-d0a9a6293e91", "c42de2d8-d450-18ae-8eb2-47588de38e09", "c50a10ca-b79c-4c2b-830d-d595806753b4", "c559e8e1-8841-48e2-9671-660689adfb88", "c659be24-dc38-4427-830d-0d27590cbd97", "c70ffa07-4090-4f90-9044-d229b791bc14", "c7c8aaa0-dac8-4185-b89c-0c5fe7aa1b25", "c7f5636c-e508-42bb-97cc-43723d8a5e82", "c8b3e4a6-541d-4498-a86c-4f421a748748", "c91dfae1-7418-4283-84a5-eb094ea4314f", "cbaf8ca3-f011-4d62-a412-d79d0fda41e5", "cbdde6f7-7139-43f5-8e24-b14bc0507532", "cdafc555-cd3a-490e-8734-d183694a7420", "cdbd4541-2b30-7ff0-0b2a-f49f242117c3", "cebbfd4e-5459-4799-8edc-87397ea37d38", "cec0385a-400a-4355-89ce-6d67df83bb90", "cf02f01f-e1cd-48df-becb-d375123d5711", "cf4b0010-0d35-32a0-0941-2e201199188c", "d1562ef0-f426-4863-b1d0-2dd8a64bfe34", "d21d8b68-52e7-4143-abfc-16b7f00ff036", "d24d5e8f-bcb8-aa8d-9801-80ed359ca9f4", "d26b1396-a2b9-4ca0-91ed-99070781623d", "d37a3d4d-accb-497a-9b33-186015dcf2cb", "d3a3b1c3-0b63-40a9-b333-0d48fd214640", "d40a2dfa-b387-4121-aa7c-ccf7a9e04978", "d4d40923-f1b6-a435-bca8-4110dc25cd94", "d5e93a53-9308-30b4-a47c-163022655063", "d6afaa1c-2bdb-61a1-d93a-a3bcf40793b8", "d6d66502-4721-b571-1fe1-f19838254af4", "d839ea26-f4c8-2963-0057-a97229b08a47", "d877815a-7815-0bbd-44ce-ee273e7a5fd9", "da67899f-5786-db7c-8195-790e0e01768d", "da8e204c-32a0-4ead-ba8b-144dd5a9f844", "daf84ce4-8769-e2f0-239d-86b40d49e23d", "dbbc135a-6363-6e71-2f44-d2ada253b5c7", "dc2ff3d4-0b95-4dcd-2757-d015bca54836", "dcdc58c7-fdce-4055-bf7b-ba42b95f69bc", "dfb67f57-cdd9-5456-8f94-70aa2757a5ab", "e051d867-22df-4e18-826b-03d7c1c627d2", "e07b48e1-d039-d4ce-7c04-45987faa726e", "e0ff2fef-edd0-454e-ac18-0e027c97b2dd", "e4f46221-ead2-e7e3-199f-f38f795356ca", "e573e63e-96fb-434c-b781-02774061a634", "e5746944-274d-4600-8dec-0b7de03d6ec6", "e70caf6b-132a-48b5-a281-890bc0960aef", "e9098fce-7d09-41b4-a1c8-7fb319fbec11", "e9a89dad-2ecb-1df6-bf70-bbd07a99e921", "eaa463ba-736c-4d34-8ffd-daa4c3c4a452", "eabed2b0-1f45-378e-9370-14a10b93bedb", "eadb222d-675b-47f8-933b-95144d4a5852", "ecaa4e17-f347-45d9-a9ed-0797a627c221", "eccf837b-483a-47f6-8d50-36d6b8b5dd9b", "ecff72cc-38c5-4a17-9d06-84d68740f42d", "ed4c0c7a-f342-4a85-8065-0007a72f3cb6", "edc375cd-b33a-41d9-8e7e-0ebff4c00456", "ef5cfbac-ecf4-eeb1-98c0-4271fd213ab3", "ef79318d-080d-477b-ab08-ed978a246b13", "f0b42009-1457-41ae-9db8-d0c536eb8f17", "f4543641-6a9a-46f3-9d14-2150a6e0386f", "f4782935-4baf-498e-89e0-acc171f38019", "f637886a-59e4-d4a9-edd2-df40c57a15f9", "f6607e37-bf68-4063-b783-36d7faa9eaed", "f7384444-647e-4946-bb7d-78559506b847", "f73b1b74-6f07-4e79-9d4d-bbf81c35d58a", "f761fc85-bc5b-421d-8a94-c396e0b35962", "f7624fff-2966-4f07-93dd-c3c8d9be0f77", "f93f58f5-d1d6-4d06-aba9-82d9c79fbf73", "f9646574-ddee-2460-ee3e-a707eb1cc0be", "f9654c78-988c-4091-8798-368fd8944a22", "fa297d5d-d381-43f0-852c-3860566dcb3b", "fa812ac6-cd9e-4150-beee-c515e58dc803", "fb7675a3-575d-47e5-8be9-800c02b3af74", "fecb3c65-ee6b-f325-26b0-21fbe2c93ae3"]);
  const marketDeals=['On Sale','DG Brands','Dollar Deals','DG Deal Days','Comfort Bay','trueliving'];
  const target = '35ef70d0-3d20-4599-96a3-648ee3c7c340';
  const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  const targetRooms = new Map([
    ['Canned Goods & Soups', 'dark_shelf'],
    ['Condiments & Sauces', 'dark_shelf'],
    ['Dairy & Eggs', 'glass_cooler']
  ]);
  const assets = 'target-studio/product-scale/v1/';
  const manifest = assets + 'a18331f4777f1067fd3c0a2c22b08745128a477f24b08ace9751cbc92acf3a63.json';
  const plateFiles = {
    shelf: assets + 'f15c230adeff3a1593fe24ba227e99816ebd0ef57540f4ba738976954030cf6c.png',
    cooler: assets + '3cf7c88db2375354e6dfe501f70e43876ca9697266e0077ef49c0cf343a77418.png'
  };
  const rulesURL = new URL('shelf-product-kinds.json', document.currentScript?.src || document.baseURI);
  const dgRulesURL = new URL('dg-product-kinds.json', document.currentScript?.src || document.baseURI);
  const fields = 'id,store_id,category,name,full_name,price,image_url,image_url_orig,shelf_group';
  const base = () => window.StudioTransferConfig.url;
  const media = path => base() + '/storage/v1/object/public/menu-images/' + path;
  const immutable = new Map();

  function staticJSON(url) {
    const href = String(url);
    if (!immutable.has(href)) {
      immutable.set(href, fetch(href).then(response => {
        if (!response.ok) throw Error('Could not load the shelf artwork or product groups.');
        return response.json();
      }).catch(error => { immutable.delete(href); throw error; }));
    }
    return immutable.get(href);
  }

  async function read(table, query, signal) {
    const {url,key} = window.StudioTransferConfig;
    const request = url + '/rest/v1/' + table + '?' + new URLSearchParams(query);
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(request,{signal,headers:{apikey:key,Authorization:'Bearer '+key}});
      if (response.ok) return response.json();
      if (attempt || response.status < 500) throw Error('The store could not load its shelf products. Try again.');
    }
  }

  async function pages(table, query, signal) {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const batch = await read(table,{...query,limit:1000,offset},signal);
      all.push(...batch);
      if (batch.length < 1000) return all;
    }
  }

  async function byIds(store, ids, signal) {
    const batches = [];
    for (let i = 0; i < ids.length; i += 65) batches.push(ids.slice(i,i+65));
    const rows = [];
    for (let i = 0; i < batches.length; i += 4) {
      const responses = await Promise.all(batches.slice(i,i+4).map(batch =>
        read('products',{select:fields,store_id:'eq.'+store,id:'in.('+batch.join(',')+')'},signal)));
      for (const result of responses) rows.push(...result);
    }
    return rows;
  }

  function photo(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const raw = value.trim();
    try {
      const url = raw.includes(':') ? new URL(raw) : new URL(media(raw));
      return url.protocol === 'https:' && !url.username && !url.password &&
        !/\.svg(?:$|[?#])/i.test(url.pathname) ? url.href : '';
    } catch { return ''; }
  }

  // Ask DG's own image service for a sharp, bandwidth-conscious shelf photo.
  // The original URL remains available as a fallback and is never overwritten.
  function dollarGeneralPhoto(value) {
    try {
      const url = new URL(value);
      if (url.hostname !== 's7d1.scene7.com' || !url.pathname.startsWith('/is/image/dolgen/')) return value;
      for (const [key,val] of Object.entries({wid:'600',hei:'600',fit:'constrain',fmt:'jpeg',qlt:'90'})) url.searchParams.set(key,val);
      return url.href;
    } catch { return value; }
  }

  // Prefer the calibrated Target group. Some raw milk records have catalog group "Eggs".
  function kindFor(rules, aisle, group, name, calibrated) {
    const family = rules[aisle];
    if (!family) return group || aisle;
    const alias = family.aliases[group.toLowerCase()];
    if (calibrated && alias) return alias;
    const title = name.split(' - ')[0].replace(/[™®]/g,'');
    for (const [kind, pattern] of family.rules) if (pattern.test(title)) return kind;
    return alias || group || aisle;
  }

  // Match specific names first, then use only the supplier groups that describe
  // merchandise. Campaign and brand names never become default aisle tabs.
  function dollarGeneralKinds(entries, aisle) {
    const rules = entries.map(([label, pattern, ...aliases]) => ({
      label, pattern:pattern ? new RegExp(pattern,'i') : null, aliases
    }));
    const drinkOrder = [
      'Cola & pepper soda', 'Citrus soda', 'Root beer & cream soda', 'Ginger ale',
      'Fruit & specialty soda', 'Drinking water', 'Sparkling & flavored water',
      'Sports & hydration drinks', 'Energy drinks', 'Juice & lemonade', 'Iced tea',
      'Chocolate & coffee drinks', 'Drink mixes', 'Beer & hard beverages', 'Bottled beverages'
    ];
    const labels = aisle === 'Soda, Water & Drinks' ? drinkOrder : rules.map(rule => rule.label);
    const ranks = new Map(labels.map((label,index) => [label,index]));
    return (name, group) => {
      const title = name.replace(/&#(?:8217|39);|&apos;|[’‘]/g, "'").replace(/&amp;/g,'&');
      const matched = rules.find(rule => rule.pattern?.test(title)) ||
        rules.find(rule => rule.aliases.includes(group)) || rules.at(-1);
      const kind = matched?.label || aisle;
      return {kind,kindOrder:ranks.get(kind) ?? labels.length};
    };
  }

  function naturalSize(name) {
    return (name.match(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|lbs?|oz|gals?|ml|kg|g|ct)\b/i)||[])[0] || '';
  }

  function safeAtlas(path, scene) {
    if (typeof path !== 'string' || typeof scene !== 'string') return false;
    const folder=scene.slice(0,scene.lastIndexOf('/')+1);
    const prefix=path.startsWith(assets) ? assets : folder;
    return (prefix===assets || /^target-renders\/[a-z-]+\/$/.test(prefix)) &&
      path.startsWith(prefix) && /^[0-9a-f]{64}\.webp$/.test(path.slice(prefix.length));
  }

  async function sourceArt(aisle, signal) {
    if (!targetRooms.has(aisle)) return new Map();
    const [atlas, rows] = await Promise.all([
      staticJSON(media(manifest)),
      pages('target_renders',{select:'render_no,image_path,target_render_slots(product_id,slot,shelf_group,size)',aisle:'eq.'+aisle,
        status:'eq.done',facings:'eq.2',display:'eq.'+targetRooms.get(aisle),order:'render_no'},signal)
    ]);
    const art = new Map();
    for (const row of rows) {
      const panel = atlas.panels?.[row.render_no];
      const matched = panel?.scene === row.image_path && panel.fixture === targetRooms.get(aisle) && safeAtlas(panel.atlas,panel.scene);
      const cropById = new Map((matched ? panel.slots : []).map(crop=>[crop.id,crop]));
      for (const spot of row.target_render_slots || []) {
        const id=spot.product_id;
        if (!uuid.test(id) || art.has(id)) continue;
        const crop = cropById.get(id), extra = {};
        if (crop && Array.isArray(crop.src) && crop.src.length===4 && crop.src.every(Number.isFinite) &&
            crop.src[0]>=0 && crop.src[1]>=0 && crop.src[2]>0 && crop.src[3]>0 &&
            crop.src[0]+crop.src[2]<=atlas.atlasWidth && crop.src[1]+crop.src[3]<=atlas.atlasHeight) {
          Object.assign(extra,{source:crop.src,atlas:media(panel.atlas),aspect:crop.src[2]/crop.src[3],base:crop.dst});
        }
        art.set(id,{group:String(spot.shelf_group||'').trim(),size:String(spot.size||'').trim(),panel:row.render_no,slot:spot.slot,...extra});
      }
    }
    return art;
  }

  async function load({store,aisle,authoredId,mode,signal}) {
    if (!uuid.test(store||'') || !String(aisle||'').trim() || (authoredId && !uuid.test(authoredId))) {
      throw Error('Choose a store and an aisle.');
    }
    let source = aisle, custom, fixture;
    if (authoredId) {
      const rows = await read('rpc/studio_grocery_aisles',{p_store_id:store},signal);
      const match=rows.find(row=>row.store_id===store && row.aisle_id===authoredId && row.published_revision>0);
      if (!match) throw Error('This published aisle is unavailable at this store.');
      fixture = match.fixture;
      source = match.source_aisle || match.title;
      if (match.stock_mode==='custom') custom=match.product_ids;
    }
    const isDollarGeneral = dollarGeneralStores.has(store);
    const catalogPromise = custom ? Promise.resolve([]) :
      pages('products',{select:fields,store_id:'eq.'+store,category:store==='fea775c8-8612-4f2e-bfc6-70d8e6ace6be'&&source==='Deals & General Merchandise'?'in.('+marketDeals.map(x=>'"'+x+'"').join(',')+')':'eq.'+source,order:'shelf_group.nullslast,name,id'},signal);
    // Both DG formats use their own live catalog for ordinary merchandise; a special
    // physical render is shown in its own bay, not duplicated on a code shelf.
    const stockPromise = custom ? Promise.resolve(custom) : isDollarGeneral && !authoredId ?
      catalogPromise.then(rows=>rows.map(row=>row.id)) :
      pages('rpc/studio_grocery_aisle_original_stock',{p_store_id:store,p_source_aisle:source,order:'position'},signal).then(rows=>rows.map(row=>row.product_id));
    const renderedPromise = isDollarGeneral && !authoredId ? pages('aisle_slots',{select:'product_id',store_id:'eq.'+store,tag_x:'not.is.null',tag_y:'not.is.null',tag_w:'not.is.null',tag_h:'not.is.null',order:'product_id'},signal).then(rows=>new Set(rows.map(row=>row.product_id))) : Promise.resolve(new Set());
    const [ids,stock,art,rulesJSON,dgRules,renderedIds] = await Promise.all([
      stockPromise,catalogPromise,store===target ? sourceArt(source,signal) : Promise.resolve(new Map()),staticJSON(rulesURL),
      isDollarGeneral ? staticJSON(dgRulesURL) : Promise.resolve(null),renderedPromise
    ]);
    const scoped = new Map(stock.filter(row=>row.store_id===store).map(row=>[row.id,row]));
    const ordered = [...new Set(ids.filter(id=>typeof id==='string' && uuid.test(id) && !renderedIds.has(id) && !(isDollarGeneral&&!authoredId&&dgPhysicalOnly.has(id))))];
    const missing = ordered.filter(id=>!scoped.has(id));
    for (const row of await byIds(store,missing,signal)) if (row.store_id===store) scoped.set(row.id,row);
    const rules = Object.fromEntries(Object.entries(rulesJSON).map(([key,value])=>[key,{
      aliases:value.aliases,rules:value.rules.map(([kind,pattern])=>[kind,new RegExp(pattern,'i')])
    }]));
    const dgAlias={'Cleaning':'Household Cleaning','Household':'Home Decor & Storage','Beauty':'Beauty & Hair Care','Health':'Health & Wellness','Electronics':'Electronics & Tech','Baby':'Baby & Diapers','Pet':'Pet Supplies','Office & School Supplies':'School & Office','Party & Occasions':'Party & Celebrations','Outdoor Living':'Outdoor & Garden','Seasonal':'Seasonal & Holidays','Apparel':'Apparel & Accessories','Toys':'Toys & Games'};
    const dgEntries=isDollarGeneral?(dgRules[source]||dgRules[dgAlias[source]]):null;
    const classify = dgEntries ? dollarGeneralKinds(dgEntries,source) : null;
    const items=[];
    for (const [sourceIndex,id] of ordered.entries()) {
      const row = scoped.get(id);
      if (!row) continue; // The SKU may have been removed since the membership read.
      const calibrated=art.get(id), group=calibrated?.group || String(row.shelf_group || '').trim() || source;
      const name=String(row.name||row.full_name||'').trim();
      const price=row.price==null || !Number.isFinite(Number(row.price)) || Number(row.price)<0 ? null : Number(row.price);
      const originals=[...new Set([photo(row.image_url),photo(row.image_url_orig)].filter(Boolean))];
      const dollarGeneral=mode==='dollar-general' || isDollarGeneral;
      const photos=[...new Set([...(dollarGeneral?originals.map(dollarGeneralPhoto):[]),...originals])];
      const type = classify ? classify(name,group) : {kind:kindFor(rules,source,group,name,Boolean(calibrated?.group))};
      items.push({...calibrated,id,sourceIndex,name,price,group,...type,
        size:calibrated?.size || naturalSize(row.full_name||name),image:photos[0]||'',photos});
    }
    if (isDollarGeneral && window.DollarGeneralShelfPhotos) await window.DollarGeneralShelfPhotos.apply(items,scoped);
    fixture = fixture || (/frozen|freezer/i.test(source) ? 'freezer' : /dairy|refrigerated|seafood|meat|deli/i.test(source) ? 'cooler' : 'shelf');
    return {items,fixture,plate:media(plateFiles[fixture] || (fixture==='freezer'?plateFiles.cooler:plateFiles.shelf)),
      groups:[...new Set(items.map(item=>item.group))], kinds:[...new Set(items.map(item=>item.kind))]};
  }

  window.ShelfLayoutData = {load};
})();

