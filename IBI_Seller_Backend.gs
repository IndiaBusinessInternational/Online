// ============================================================
// IBI MARKETPLACE — Google Apps Script  (Complete v3)
// ============================================================
// HOW TO USE:
// 1. In Apps Script editor → SELECT ALL (Ctrl+A) → DELETE
// 2. PASTE this entire file
// 3. Save (Ctrl+S)
// 4. Deploy → Manage Deployments → Edit pencil → New version → Deploy
// 5. Add TWO On Edit triggers:
//    - onSellerStatusChange
//    - onProductStatusChange
// ============================================================

const SHEET_NAME   = 'Sellers';
const PROD_SHEET   = 'Products';
const SPREADSHEET_ID = '1Ul7cQKiFvGBgrKgfVlePRoDNro-KBiOwRS6wV55almw'; // IBI Google Sheet

// Helper — always opens the correct spreadsheet by ID (works in standalone scripts)
function getIBISpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const COL = {
  TIMESTAMP:1,SELLER_ID:2,BIZ_NAME:3,OWNER:4,EMAIL:5,
  MOBILE:6,GSTIN:7,CATEGORY:8,CITY:9,ABOUT:10,
  STATUS:11,PIN:12,REJECT_REASON:13,APPROVED_ON:14
};

// IMPORTANT: this MUST match the column order written by appendRow in addProduct().
// Layout is 23 columns. Do NOT change one without changing the other.
const PCOL = {
  TIMESTAMP:1, PRODUCT_ID:2, SELLER_ID:3, BIZ_NAME:4,
  TITLE:5, CATEGORY:6, BRAND:7, PRICE:8, MRP:9, IMG:10,
  ADDITIONAL_IMGS:11, DESCRIPTION:12, BULLETS:13, STOCK:14, HSN:15,
  TAGS:16, PRODUCT_DIMENSIONS:17, PACKAGE_DIMENSIONS:18, VARIATIONS:19,
  STATUS:20, REJECT_REASON:21, APPROVED_ON:22, UPDATED_ON:23
};

function doGet(e) {
  const action = (e.parameter.action||'').trim();
  const cb     = e.parameter.callback || null;  // JSONP support
  let result;

  // ── Seller actions ──────────────────────────────────────
  if      (action==='register')              result = registerSeller(e.parameter);
  else if (action==='checkStatus')           result = checkSellerStatus(e.parameter);
  else if (action==='getStats')              result = getSellerStats(e.parameter);

  // ── Product actions ─────────────────────────────────────
  else if (action==='addProduct')            result = addProduct(e.parameter);
  else if (action==='editProduct')           result = editProduct(e.parameter);
  else if (action==='getSellerProducts')     result = getSellerProducts(e.parameter);
  else if (action==='getProduct')            result = getProduct(e.parameter);
  else if (action==='pauseProduct')          result = pauseProduct_fn(e.parameter);
  else if (action==='deleteProduct')         result = deleteProduct_fn(e.parameter);
  else if (action==='getApprovedProducts')   result = getApprovedProducts();

  // ── Admin actions ────────────────────────────────────────
  else if (action==='adminGetSellers')          result = adminGetSellers(e.parameter);
  else if (action==='adminGetProducts')         result = adminGetProducts(e.parameter);
  else if (action==='adminGetCustomers')        result = adminGetCustomers(e.parameter);
  else if (action==='adminUpdateProduct')       result = adminUpdateProduct(e.parameter);
  else if (action==='adminEditProduct')         result = adminEditProduct(e.parameter);
  else if (action==='adminEditSeller')          result = adminEditSeller(e.parameter);
  else if (action==='adminUpdateSellerStatus')  result = adminUpdateSellerStatus(e.parameter);
  else if (action==='adminUpdateProductStatus') result = adminUpdateProductStatus(e.parameter);

  // ── Orders & Earnings actions ────────────────────────────
  else if (action==='saveOrder')               result = saveOrder(e.parameter);
  else if (action==='getSellerEarnings')       result = getSellerEarnings(e.parameter);
  else if (action==='getAdminOrders')          result = getAdminOrders(e.parameter);
  else if (action==='adminUpdateOrderPayout')  result = adminUpdateOrderPayout(e.parameter);
  else if (action==='adminUpdateOrderStatus')  result = adminUpdateOrderStatus(e.parameter);

  // ── Image Upload → Google Drive ────────────────────────
  else if (action==='uploadImage') result = uploadImageToDrive(e.parameter);

  // ── Zoho Payment ────────────────────────────────────────
  else if (action==='createZohoPaymentLink') result = createZohoPaymentLink(e.parameter);

  // ── Visitor Analytics ───────────────────────────────────
  else if (action==='trackVisit')     result = trackVisit(e.parameter);

  // ── Seller Orders ────────────────────────────────────────
  else if (action==='getSellerOrders') result = getSellerOrders(e.parameter);

  // ── Support Tickets ──────────────────────────────────────
  else if (action==='saveTicket')     result = saveTicket(e.parameter);

  else result = jsonResponse({success:false, error:'Unknown action: '+action});

  // If JSONP callback requested, wrap result
  if (cb) {
    const text = result.getContent();
    return ContentService.createTextOutput(cb+'('+text+')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return result;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    // Route all actions through doPost (supports large payloads like base64 images)
    if (d.action === 'register')    return registerSeller(d);
    if (d.action === 'uploadImage') return uploadImageToDrive(d);
    if (d.action === 'addProduct')  return addProduct(d);
    if (d.action === 'editProduct') return editProduct(d);
    if (d.action === 'saveOrder')   return saveOrder(d);
    return jsonResponse({success:false, error:'Unknown action: '+d.action});
  } catch(err) {
    return jsonResponse({success:false, error:err.message});
  }
}

// ============================================================
// SETUP FUNCTION — Run this ONCE manually to create all sheets
// Steps: In Apps Script → select "setupIBISheets" → click Run
// ============================================================
function setupIBISheets() {
  // Create all 3 sheets at once
  getOrCreateSellerSheet();
  getOrCreateProductSheet();
  getOrCreateOrderSheet();
  // Log result (check Execution log below)
  Logger.log('✅ SUCCESS: All 3 sheets created — Sellers, Products, Orders');
  Logger.log('Spreadsheet: ' + getIBISpreadsheet().getName());
}



function registerSeller(p) {
  const sheet=getOrCreateSellerSheet();
  const email=(p.email||'').toLowerCase().trim();
  if(!email||!p.bizName||!p.ownerName||!p.mobile)
    return jsonResponse({success:false,error:'Missing fields'});
  const ex=findSellerByEmail(sheet,email);
  if(ex) return jsonResponse({success:false,alreadyExists:true,status:ex[COL.STATUS-1],message:'Already registered. Status: '+ex[COL.STATUS-1]});
  const sid='IBI'+Math.floor(100000+Math.random()*900000);
  sheet.appendRow([new Date().toLocaleString('en-IN'),sid,p.bizName||'',p.ownerName||'',email,p.mobile||'',p.gstin||'',p.category||'',p.city||'',p.about||'','Pending','','','']);
  sheet.getRange(sheet.getLastRow(),COL.STATUS,1,1).setBackground('#FFF9C4');
  try{MailApp.sendEmail({to:'indiabusinessinternational@gmail.com',subject:'New Seller: '+p.bizName+' ['+sid+']',htmlBody:regHTML(sid,p)});}catch(e2){Logger.log(e2);}
  return jsonResponse({success:true,sellerId:sid,message:'Registration successful!'});
}

function checkSellerStatus(p) {
  const sheet=getOrCreateSellerSheet();
  const email=(p.email||'').toLowerCase().trim();
  const sid=(p.sellerId||'').toUpperCase().trim();
  const pin=(p.pin||'').trim();
  const row=email?findSellerByEmail(sheet,email):findSellerById(sheet,sid);
  if(!row) return jsonResponse({success:false,status:'NotFound',message:'Seller not found.'});
  const status=row[COL.STATUS-1]||'Pending';
  const sPin=row[COL.PIN-1]||'';
  const biz=row[COL.BIZ_NAME-1]||'';
  if(status==='Pending') return jsonResponse({success:false,status:'Pending',bizName:biz,message:'Application under review.'});
  if(status==='Rejected') return jsonResponse({success:false,status:'Rejected',bizName:biz,reason:row[COL.REJECT_REASON-1]||'Contact IBI.',message:'Not approved.'});
  if(status==='Approved'){
    if(!pin) return jsonResponse({success:false,status:'Approved',needsPin:true,message:'Enter PIN.'});
    if(pin!==sPin) return jsonResponse({success:false,status:'WrongPin',message:'Incorrect PIN.'});
    return jsonResponse({success:true,status:'Approved',sellerId:row[COL.SELLER_ID-1],bizName:biz,ownerName:row[COL.OWNER-1],category:row[COL.CATEGORY-1],city:row[COL.CITY-1],approvedOn:row[COL.APPROVED_ON-1]});
  }
  return jsonResponse({success:false,status:status,message:'Unknown status.'});
}

function getSellerStats(p) {
  const sheet=getOrCreateSellerSheet();
  const row=findSellerById(sheet,(p.sellerId||'').toUpperCase().trim());
  if(!row) return jsonResponse({success:false,message:'Not found'});
  if(row[COL.PIN-1]!==(p.pin||'')) return jsonResponse({success:false,message:'Unauthorized'});
  return jsonResponse({success:true,bizName:row[COL.BIZ_NAME-1],ownerName:row[COL.OWNER-1],email:row[COL.EMAIL-1],mobile:row[COL.MOBILE-1],category:row[COL.CATEGORY-1],city:row[COL.CITY-1],approvedOn:row[COL.APPROVED_ON-1]});
}

function addProduct(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const seller=findSellerById(getOrCreateSellerSheet(),p.sellerId.toUpperCase());
  const biz=seller?(seller[COL.BIZ_NAME-1]||''):p.sellerId;
  const pid='PROD-'+p.sellerId.toUpperCase()+'-'+Date.now().toString().slice(-6);
  sheet.appendRow([new Date().toLocaleString('en-IN'),pid,p.sellerId.toUpperCase(),biz,p.title,p.category,p.brand,parseFloat(p.price)||0,parseFloat(p.mrp)||0,p.img||'',p.additionalImgs||'',p.description||'',p.bullets||'',parseInt(p.stock)||0,p.hsn||'',p.tags||'',p.productDimensions||'',p.packageDimensions||'',p.variations||'[]','Pending','','','']);
  sheet.getRange(sheet.getLastRow(),PCOL.STATUS,1,1).setBackground('#FFF9C4');
  try{MailApp.sendEmail({to:'indiabusinessinternational@gmail.com',subject:'New Product: '+p.title.substring(0,40)+' ['+p.sellerId+']',htmlBody:prodSubmitHTML(pid,p,biz)});}catch(e2){Logger.log(e2);}
  return jsonResponse({success:true,productId:pid,message:'Submitted for review!'});
}

function editProduct(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const f=findProductRow(sheet,p.productId,p.sellerId);
  if(!f.rowNum) return jsonResponse({success:false,message:'Not found'});
  const r=f.rowNum;
  sheet.getRange(r,PCOL.TITLE,1,1).setValue(p.title||'');
  sheet.getRange(r,PCOL.CATEGORY,1,1).setValue(p.category||'');
  sheet.getRange(r,PCOL.BRAND,1,1).setValue(p.brand||'');
  sheet.getRange(r,PCOL.PRICE,1,1).setValue(parseFloat(p.price)||0);
  sheet.getRange(r,PCOL.MRP,1,1).setValue(parseFloat(p.mrp)||0);
  sheet.getRange(r,PCOL.IMG,1,1).setValue(p.img||'');
  sheet.getRange(r,PCOL.DESCRIPTION,1,1).setValue(p.description||'');
  sheet.getRange(r,PCOL.BULLETS,1,1).setValue(p.bullets||'');
  sheet.getRange(r,PCOL.STOCK,1,1).setValue(parseInt(p.stock)||0);
  sheet.getRange(r,PCOL.HSN,1,1).setValue(p.hsn||'');
  sheet.getRange(r,PCOL.STATUS,1,1).setValue('Pending').setBackground('#FFF9C4');
  sheet.getRange(r,PCOL.UPDATED_ON,1,1).setValue(new Date().toLocaleString('en-IN'));
  return jsonResponse({success:true,message:'Updated — pending re-approval'});
}

function getSellerProducts(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const data=sheet.getDataRange().getValues();
  const prods=[];
  for(let i=1;i<data.length;i++){
    const row=data[i];
    if((row[PCOL.SELLER_ID-1]||'').toUpperCase()!==p.sellerId.toUpperCase()) continue;
    prods.push({productId:row[PCOL.PRODUCT_ID-1],title:row[PCOL.TITLE-1],category:row[PCOL.CATEGORY-1],brand:row[PCOL.BRAND-1],price:row[PCOL.PRICE-1],mrp:row[PCOL.MRP-1],img:row[PCOL.IMG-1]||'',additionalImgs:row[PCOL.ADDITIONAL_IMGS-1]||'',description:row[PCOL.DESCRIPTION-1]||'',bullets:row[PCOL.BULLETS-1]||'',stock:row[PCOL.STOCK-1],tags:row[PCOL.TAGS-1]||'',variations:row[PCOL.VARIATIONS-1]||'[]',status:row[PCOL.STATUS-1]||'Pending',rejectReason:row[PCOL.REJECT_REASON-1]||'',approvedOn:row[PCOL.APPROVED_ON-1]||''});
  }
  return jsonResponse({success:true,products:prods});
}

function getProduct(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const f=findProductRow(sheet,p.productId,p.sellerId);
  if(!f.data) return jsonResponse({success:false,message:'Not found'});
  const d=f.data;
  return jsonResponse({success:true,product:{productId:d[PCOL.PRODUCT_ID-1],title:d[PCOL.TITLE-1],category:d[PCOL.CATEGORY-1],brand:d[PCOL.BRAND-1],price:d[PCOL.PRICE-1],mrp:d[PCOL.MRP-1],img:d[PCOL.IMG-1],description:d[PCOL.DESCRIPTION-1],bullets:d[PCOL.BULLETS-1],stock:d[PCOL.STOCK-1],hsn:d[PCOL.HSN-1],status:d[PCOL.STATUS-1]}});
}

function pauseProduct_fn(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const f=findProductRow(sheet,p.productId,p.sellerId);
  if(!f.rowNum) return jsonResponse({success:false,message:'Not found'});
  const bg=p.newStatus==='Paused'?'#CFD8DC':'#C8E6C9';
  sheet.getRange(f.rowNum,PCOL.STATUS,1,1).setValue(p.newStatus).setBackground(bg);
  return jsonResponse({success:true,message:'Updated to '+p.newStatus});
}

function deleteProduct_fn(p) {
  if(!verifySellerPin(p.sellerId,p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet=getOrCreateProductSheet();
  const f=findProductRow(sheet,p.productId,p.sellerId);
  if(!f.rowNum) return jsonResponse({success:false,message:'Not found'});
  sheet.deleteRow(f.rowNum);
  return jsonResponse({success:true,message:'Deleted'});
}

function getApprovedProducts() {
  const sheet=getOrCreateProductSheet();
  const data=sheet.getDataRange().getValues();
  const prods=[];
  for(let i=1;i<data.length;i++){
    const row=data[i];
    if((row[PCOL.STATUS-1]||'')!=='Approved') continue;
    prods.push({productId:row[PCOL.PRODUCT_ID-1],sellerId:row[PCOL.SELLER_ID-1],bizName:row[PCOL.BIZ_NAME-1],title:row[PCOL.TITLE-1],category:row[PCOL.CATEGORY-1],brand:row[PCOL.BRAND-1],price:row[PCOL.PRICE-1],mrp:row[PCOL.MRP-1],img:row[PCOL.IMG-1],additionalImgs:row[PCOL.ADDITIONAL_IMGS-1]||'',variations:row[PCOL.VARIATIONS-1]||'[]',description:row[PCOL.DESCRIPTION-1],bullets:row[PCOL.BULLETS-1],stock:row[PCOL.STOCK-1]});
  }
  return jsonResponse({success:true,products:prods});
}

// ── On Edit Triggers ──────────────────────────────────────

function onSellerStatusChange(e) {
  try {
    const sheet=e.source.getActiveSheet();
    if(sheet.getName()!==SHEET_NAME) return;
    if(e.range.getColumn()!==COL.STATUS) return;
    const row=e.range.getRow();
    if(row<=1) return;
    const status=e.range.getValue();
    const rd=sheet.getRange(row,1,1,14).getValues()[0];
    const sid=rd[COL.SELLER_ID-1]||'';
    const biz=rd[COL.BIZ_NAME-1]||'';
    const owner=rd[COL.OWNER-1]||'';
    const email=rd[COL.EMAIL-1]||'';
    const mob=rd[COL.MOBILE-1]||'';
    let pin=rd[COL.PIN-1]||'';
    const reason=rd[COL.REJECT_REASON-1]||'Contact IBI.';
    if(!email) return;
    if(status==='Approved'){
      sheet.getRange(row,COL.APPROVED_ON,1,1).setValue(new Date().toLocaleDateString('en-IN'));
      sheet.getRange(row,COL.STATUS,1,1).setBackground('#C8E6C9');
      if(!pin){pin=sid.slice(-4)+'@IBI';sheet.getRange(row,COL.PIN,1,1).setValue(pin);}
      MailApp.sendEmail({to:email,subject:'Seller Approved — '+biz,htmlBody:approvalHTML(sid,biz,owner,pin)});
      MailApp.sendEmail({to:'indiabusinessinternational@gmail.com',subject:'Seller Approved: '+biz+' ['+sid+']',body:'PIN: '+pin+' | Email: '+email+' | Mobile: +91'+mob});
    } else if(status==='Rejected'){
      sheet.getRange(row,COL.STATUS,1,1).setBackground('#FFCDD2');
      MailApp.sendEmail({to:email,subject:'IBI Seller Application Update — '+biz,htmlBody:rejectionHTML(biz,owner,reason)});
    } else if(status==='Pending'){
      sheet.getRange(row,COL.STATUS,1,1).setBackground('#FFF9C4');
    }
  } catch(err){Logger.log('Seller trigger: '+err);}
}

function onProductStatusChange(e) {
  try {
    const sheet=e.source.getActiveSheet();
    if(sheet.getName()!==PROD_SHEET) return;
    if(e.range.getColumn()!==PCOL.STATUS) return;
    const row=e.range.getRow();
    if(row<=1) return;
    const status=e.range.getValue();
    const rd=sheet.getRange(row,1,1,18).getValues()[0];
    const pid=rd[PCOL.PRODUCT_ID-1]||'';
    const sid=rd[PCOL.SELLER_ID-1]||'';
    const biz=rd[PCOL.BIZ_NAME-1]||'';
    const title=rd[PCOL.TITLE-1]||'';
    const reason=rd[PCOL.REJECT_REASON-1]||'Contact IBI.';
    const ss2=getIBISpreadsheet().getSheetByName(SHEET_NAME);
    const sRow=ss2?findSellerById(ss2,sid):null;
    const email=sRow?sRow[COL.EMAIL-1]:'';
    if(!email) return;
    if(status==='Approved'){
      sheet.getRange(row,PCOL.APPROVED_ON,1,1).setValue(new Date().toLocaleDateString('en-IN'));
      sheet.getRange(row,PCOL.STATUS,1,1).setBackground('#C8E6C9');
      MailApp.sendEmail({to:email,subject:'Product LIVE: '+title.substring(0,40),htmlBody:prodApprovalHTML(biz,title,pid)});
    } else if(status==='Rejected'){
      sheet.getRange(row,PCOL.STATUS,1,1).setBackground('#FFCDD2');
      MailApp.sendEmail({to:email,subject:'Product Review Update: '+title.substring(0,40),htmlBody:prodRejectionHTML(biz,title,reason)});
    } else if(status==='Paused'){
      sheet.getRange(row,PCOL.STATUS,1,1).setBackground('#CFD8DC');
    } else if(status==='Pending'){
      sheet.getRange(row,PCOL.STATUS,1,1).setBackground('#FFF9C4');
    }
  } catch(err){Logger.log('Product trigger: '+err);}
}

// ── Sheet helpers ─────────────────────────────────────────

function getOrCreateSellerSheet() {
  const ss=getIBISpreadsheet();
  let s=ss.getSheetByName(SHEET_NAME);
  if(!s){
    s=ss.insertSheet(SHEET_NAME);
    s.appendRow(['Timestamp','Seller ID','Business Name','Owner Name','Email','Mobile','GSTIN/PAN','Category','City','About','Status','PIN','Reject Reason','Approved On']);
    s.getRange(1,1,1,14).setBackground('#131921').setFontColor('#fff').setFontWeight('bold');
    s.setFrozenRows(1);
    s.getRange(2,COL.STATUS,1000,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Approved','Rejected']).build());
  }
  return s;
}

function getOrCreateProductSheet() {
  const ss=getIBISpreadsheet();
  let s=ss.getSheetByName(PROD_SHEET);
  if(!s){
    s=ss.insertSheet(PROD_SHEET);
    s.appendRow(['Timestamp','Product ID','Seller ID','Business Name','Title','Category','Brand','Price','MRP','Image URL','Additional Images','Description','Bullets','Stock','HSN Code','Tags','Product Dimensions','Package Dimensions','Variations','Status','Reject Reason','Approved On','Updated On']);
    s.getRange(1,1,1,18).setBackground('#131921').setFontColor('#fff').setFontWeight('bold');
    s.setFrozenRows(1);
    s.setColumnWidth(PCOL.TITLE,250);
    s.getRange(2,PCOL.STATUS,1000,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Approved','Rejected','Paused']).build());
  }
  return s;
}

function findSellerByEmail(sheet,email) {
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++) if((data[i][COL.EMAIL-1]||'').toLowerCase().trim()===email) return data[i];
  return null;
}

function findSellerById(sheet,sid) {
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++) if((data[i][COL.SELLER_ID-1]||'').toString().toUpperCase().trim()===sid.toUpperCase().trim()) return data[i];
  return null;
}

function findProductRow(sheet,productId,sellerId) {
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++)
    if((data[i][PCOL.PRODUCT_ID-1]||'')===productId&&(data[i][PCOL.SELLER_ID-1]||'').toUpperCase()===sellerId.toUpperCase())
      return{rowNum:i+1,data:data[i]};
  return{};
}

function verifySellerPin(sellerId,pin) {
  const b={'IBI':'ibi2024','IINTELLIGENCEI':'intel2024'};
  if(b[sellerId.toUpperCase()]===pin) return true;
  const row=findSellerById(getOrCreateSellerSheet(),sellerId.toUpperCase());
  return row&&row[COL.PIN-1]===pin;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── Email HTML helpers ────────────────────────────────────

function regHTML(sid,p){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:18px;color:#fff;"><h2 style="margin:0;">New Seller Registration</h2></div><div style="padding:18px;"><table style="width:100%;font-size:13px;">'+erow('Seller ID',sid,true)+erow('Business',p.bizName)+erow('Owner',p.ownerName)+erow('Email',p.email)+erow('Mobile','+91 '+p.mobile)+erow('GSTIN',p.gstin)+erow('Category',p.category)+erow('City',p.city)+'</table><div style="margin-top:14px;padding:12px;background:#fff8f0;border-left:4px solid #f97316;border-radius:8px;">Open <b>Sellers</b> sheet → find <b>'+sid+'</b> → set STATUS = <b>Approved</b> → enter PIN.</div></div></div>';}

function approvalHTML(sid,biz,owner,pin){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:20px;color:#fff;text-align:center;"><h1 style="margin:0;">Congratulations!</h1><p>Welcome, '+owner+'!</p></div><div style="padding:20px;"><p><b>'+biz+'</b> is now an Approved IBI Seller!</p><div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:18px;margin:16px 0;"><b>Seller ID:</b> '+sid+'<br><b>PIN:</b> '+pin+'</div><p>Login: IBI Website → Sell on IBI → Seller Login</p><p>Support: +91 89394 14799</p></div></div>';}

function rejectionHTML(biz,owner,reason){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:18px;color:#fff;"><h2 style="margin:0;">Application Update</h2></div><div style="padding:18px;"><p>Dear '+owner+',</p><p>We are unable to approve <b>'+biz+'</b> at this time.</p><div style="background:#fff0f0;border-left:4px solid #dc2626;border-radius:8px;padding:12px;margin:12px 0;"><b>Reason:</b> '+reason+'</div><p>Contact: +91 89394 14799</p></div></div>';}

function prodSubmitHTML(pid,p,biz){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:18px;color:#fff;"><h2 style="margin:0;">New Product to Review</h2></div><div style="padding:18px;"><p><b>Seller:</b> '+p.sellerId+' ('+biz+')</p><p><b>Product:</b> '+p.title+'</p><p><b>Price:</b> Rs.'+p.price+' | <b>MRP:</b> Rs.'+p.mrp+' | <b>Stock:</b> '+p.stock+'</p><p><b>Image:</b> <a href="'+p.img+'">View</a></p><p><b>Description:</b> '+p.description+'</p><div style="margin-top:12px;padding:12px;background:#fff8f0;border-left:4px solid #f97316;border-radius:8px;">Open <b>Products</b> sheet → find <b>'+pid+'</b> → set STATUS = <b>Approved</b> or <b>Rejected</b></div></div></div>';}

function prodApprovalHTML(biz,title,pid){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:18px;color:#fff;"><h2 style="margin:0;">Product Approved & LIVE!</h2></div><div style="padding:18px;"><p>Hi <b>'+biz+'</b>,</p><p>Your product <b>'+title+'</b> is now LIVE on IBI Marketplace!</p><p>Product ID: <b>'+pid+'</b></p><p><a href="https://indiabusinessinternational.github.io/Online/">View on IBI Marketplace</a></p></div></div>';}

function prodRejectionHTML(biz,title,reason){return '<div style="font-family:Arial;max-width:600px;"><div style="background:#131921;padding:18px;color:#fff;"><h2 style="margin:0;">Product Review Update</h2></div><div style="padding:18px;"><p>Hi <b>'+biz+'</b>,</p><p>Product <b>'+title+'</b> could not be approved.</p><div style="background:#fff0f0;border-left:4px solid #dc2626;border-radius:8px;padding:12px;margin:12px 0;"><b>Reason:</b> '+reason+'</div><p>Please update and resubmit from Seller Dashboard. Help: +91 89394 14799</p></div></div>';}

function erow(l,v,b){const val=b?'<strong>'+v+'</strong>':(v||'-');return '<tr><td style="padding:7px;color:#666;border-bottom:1px solid #eee;">'+l+'</td><td style="padding:7px;border-bottom:1px solid #eee;">'+val+'</td></tr>';}


// ============================================================
// ADMIN ENDPOINTS — Add these to doGet function
// ============================================================
// In doGet(), add after existing actions:
//   if (action==='adminGetSellers')        return adminGetSellers(e.parameter);
//   if (action==='adminGetProducts')       return adminGetProducts(e.parameter);
//   if (action==='adminGetCustomers')      return adminGetCustomers(e.parameter);
//   if (action==='adminUpdateProduct')     return adminUpdateProduct(e.parameter);
//   if (action==='adminEditProduct')       return adminEditProduct(e.parameter);
//   if (action==='adminEditSeller')        return adminEditSeller(e.parameter);
//   if (action==='adminUpdateSellerStatus')  return adminUpdateSellerStatus(e.parameter);
//   if (action==='adminUpdateProductStatus') return adminUpdateProductStatus(e.parameter);
// ============================================================

const ADMIN_KEY = 'IBI_ADMIN_2026';

function verifyAdmin(p) {
  return (p.adminKey || '') === ADMIN_KEY;
}

function adminGetSellers(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateSellerSheet();
  const data  = sheet.getDataRange().getValues();
  const rows  = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    rows.push({
      sellerId:    r[COL.SELLER_ID-1]||'',
      bizName:     r[COL.BIZ_NAME-1]||'',
      ownerName:   r[COL.OWNER-1]||'',
      email:       r[COL.EMAIL-1]||'',
      mobile:      r[COL.MOBILE-1]||'',
      gstin:       r[COL.GSTIN-1]||'',
      category:    r[COL.CATEGORY-1]||'',
      city:        r[COL.CITY-1]||'',
      about:       r[COL.ABOUT-1]||'',
      status:      r[COL.STATUS-1]||'Pending',
      pin:         r[COL.PIN-1]||'',
      rejectReason:r[COL.REJECT_REASON-1]||'',
      approvedOn:  r[COL.APPROVED_ON-1]||'',
      timestamp:   r[COL.TIMESTAMP-1]||''
    });
  }
  return jsonResponse({success:true, sellers:rows});
}

function adminGetProducts(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateProductSheet();
  const data  = sheet.getDataRange().getValues();
  const rows  = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    rows.push({
      productId:   r[PCOL.PRODUCT_ID-1]||'',
      sellerId:    r[PCOL.SELLER_ID-1]||'',
      bizName:     r[PCOL.BIZ_NAME-1]||'',
      title:       r[PCOL.TITLE-1]||'',
      category:    r[PCOL.CATEGORY-1]||'',
      brand:       r[PCOL.BRAND-1]||'',
      price:       r[PCOL.PRICE-1]||0,
      mrp:         r[PCOL.MRP-1]||0,
      img:         r[PCOL.IMG-1]||'',
      stock:       r[PCOL.STOCK-1]||0,
      status:      r[PCOL.STATUS-1]||'Pending',
      rejectReason:r[PCOL.REJECT_REASON-1]||'',
      approvedOn:  r[PCOL.APPROVED_ON-1]||'',
      timestamp:   r[PCOL.TIMESTAMP-1]||''
    });
  }
  return jsonResponse({success:true, products:rows});
}

function adminGetCustomers(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  // Customers are in the Sellers sheet with a "Customer" marker, or we return empty
  return jsonResponse({success:true, customers:[]});
}

function adminUpdateProduct(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateProductSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][PCOL.PRODUCT_ID-1]||'') === p.productId) {
      const colMap = { price:PCOL.PRICE, mrp:PCOL.MRP, stock:PCOL.STOCK, title:PCOL.TITLE, status:PCOL.STATUS };
      const col = colMap[p.field];
      if (!col) return jsonResponse({success:false,message:'Unknown field'});
      const val = (p.field==='price'||p.field==='mrp'||p.field==='stock') ? parseFloat(p.value)||0 : p.value;
      sheet.getRange(i+1, col, 1, 1).setValue(val);
      sheet.getRange(i+1, PCOL.UPDATED_ON, 1, 1).setValue(new Date().toLocaleString('en-IN'));
      return jsonResponse({success:true, message:'Updated'});
    }
  }
  return jsonResponse({success:false, message:'Product not found'});
}

function adminEditProduct(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateProductSheet();
  const found = findProductRowById(sheet, p.productId);
  if (!found) return jsonResponse({success:false,message:'Not found'});
  const r = found;
  if(p.title)       sheet.getRange(r,PCOL.TITLE,1,1).setValue(p.title);
  if(p.category)    sheet.getRange(r,PCOL.CATEGORY,1,1).setValue(p.category);
  if(p.brand)       sheet.getRange(r,PCOL.BRAND,1,1).setValue(p.brand);
  if(p.price)       sheet.getRange(r,PCOL.PRICE,1,1).setValue(parseFloat(p.price)||0);
  if(p.mrp)         sheet.getRange(r,PCOL.MRP,1,1).setValue(parseFloat(p.mrp)||0);
  if(p.stock)       sheet.getRange(r,PCOL.STOCK,1,1).setValue(parseInt(p.stock)||0);
  if(p.img)         sheet.getRange(r,PCOL.IMG,1,1).setValue(p.img);
  if(p.status)      sheet.getRange(r,PCOL.STATUS,1,1).setValue(p.status);
  if(p.rejectReason!==undefined) sheet.getRange(r,PCOL.REJECT_REASON,1,1).setValue(p.rejectReason);
  sheet.getRange(r,PCOL.UPDATED_ON,1,1).setValue(new Date().toLocaleString('en-IN'));
  if(p.status) {
    const bg = p.status==='Approved'?'#C8E6C9':p.status==='Rejected'?'#FFCDD2':p.status==='Paused'?'#CFD8DC':'#FFF9C4';
    sheet.getRange(r,PCOL.STATUS,1,1).setBackground(bg);
  }
  return jsonResponse({success:true,message:'Product updated'});
}

function adminEditSeller(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateSellerSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.SELLER_ID-1]||'').toUpperCase() === p.sellerId.toUpperCase()) {
      if(p.status)       sheet.getRange(i+1,COL.STATUS,1,1).setValue(p.status);
      if(p.pin)          sheet.getRange(i+1,COL.PIN,1,1).setValue(p.pin);
      if(p.rejectReason!==undefined) sheet.getRange(i+1,COL.REJECT_REASON,1,1).setValue(p.rejectReason);
      const bg = p.status==='Approved'?'#C8E6C9':p.status==='Rejected'?'#FFCDD2':'#FFF9C4';
      if(p.status) sheet.getRange(i+1,COL.STATUS,1,1).setBackground(bg);
      return jsonResponse({success:true,message:'Seller updated'});
    }
  }
  return jsonResponse({success:false,message:'Seller not found'});
}

function adminUpdateSellerStatus(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  return adminEditSeller(p);
}

function adminUpdateProductStatus(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  return adminEditProduct({...p, adminKey:p.adminKey});
}

function findProductRowById(sheet, productId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++)
    if ((data[i][PCOL.PRODUCT_ID-1]||'') === productId) return i+1;
  return null;
}


// ============================================================
// ORDERS & STOCK & EARNINGS — Add to doGet:
//   if (action==='saveOrder')         return saveOrder(e.parameter);
//   if (action==='getSellerEarnings') return getSellerEarnings(e.parameter);
//   if (action==='getAdminOrders')    return getAdminOrders(e.parameter);
// ============================================================

const ORDER_SHEET  = 'Orders';
const OCOL = {
  TIMESTAMP:1, ORDER_ID:2, CUSTOMER_NAME:3, CUSTOMER_MOBILE:4,
  CUSTOMER_EMAIL:5, ADDRESS:6, ITEMS:7, TOTAL:8,
  COMMISSION:9, SELLER_PAYOUTS:10, STATUS:11, ORDER_DATE:12,
  PAYOUT_STATUS:13, PAYOUT_DATE:14
};

function saveOrder(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateOrderSheet();
  sheet.appendRow([
    new Date().toLocaleString('en-IN'),
    p.orderId||'', p.customerName||'', p.customerMobile||'',
    p.customerEmail||'', p.address||'',
    p.items||'', parseFloat(p.total)||0,
    parseFloat(p.commission)||0, p.sellerPayouts||'',
    p.status||'Placed', p.orderDate||'',
    'Pending', ''
  ]);
  const lr = sheet.getLastRow();
  sheet.getRange(lr, OCOL.STATUS, 1, 1).setBackground('#FFF9C4');
  return jsonResponse({success:true, message:'Order saved'});
}

function getSellerEarnings(p) {
  if (!verifySellerPin(p.sellerId, p.pin)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateOrderSheet();
  const data  = sheet.getDataRange().getValues();
  let gross=0, commission=0, pending=0;
  const payouts = [];

  for (let i=1; i<data.length; i++) {
    const row        = data[i];
    const payoutData = row[OCOL.SELLER_PAYOUTS-1]||'';
    if (!payoutData) continue;
    try {
      const sp = JSON.parse(payoutData);
      if (sp[p.sellerId.toLowerCase()]) {
        const s = sp[p.sellerId.toLowerCase()];
        gross      += s.grossAmount  || 0;
        commission += s.commission   || 0;
        if (row[OCOL.PAYOUT_STATUS-1] !== 'Paid') pending += s.netAmount || 0;
      }
      if (p.sellerId.toUpperCase() === p.sellerId.toUpperCase()) {
        const sUp = sp[p.sellerId.toUpperCase()];
        if (sUp) {
          gross      += sUp.grossAmount  || 0;
          commission += sUp.commission   || 0;
          if (row[OCOL.PAYOUT_STATUS-1] !== 'Paid') pending += sUp.netAmount || 0;
        }
      }
    } catch(e2) {}

    // Payout history
    if (row[OCOL.PAYOUT_STATUS-1] === 'Paid') {
      payouts.push({
        date:   row[OCOL.PAYOUT_DATE-1]||'',
        amount: row[OCOL.COMMISSION-1]||0,
        ref:    row[OCOL.ORDER_ID-1]||'',
        status: 'Paid',
        method: 'NEFT/UPI'
      });
    }
  }

  return jsonResponse({success:true, earnings:{
    grossAmount:  gross,
    commission:   commission,
    netAmount:    gross - commission,
    pendingPayout:pending
  }, payouts: payouts.slice(-10)});
}

function getAdminOrders(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateOrderSheet();
  const data  = sheet.getDataRange().getValues();
  const orders = [];
  for (let i=1; i<data.length; i++) {
    const r = data[i];
    orders.push({
      orderId:         r[OCOL.ORDER_ID-1]||'',
      customerName:    r[OCOL.CUSTOMER_NAME-1]||'',
      customerMobile:  r[OCOL.CUSTOMER_MOBILE-1]||'',
      customerEmail:   r[OCOL.CUSTOMER_EMAIL-1]||'',
      address:         r[OCOL.ADDRESS-1]||'',
      total:           r[OCOL.TOTAL-1]||0,
      commission:      r[OCOL.COMMISSION-1]||0,
      status:          r[OCOL.STATUS-1]||'Placed',
      orderDate:       r[OCOL.ORDER_DATE-1]||'',
      payoutStatus:    r[OCOL.PAYOUT_STATUS-1]||'Pending'
    });
  }
  return jsonResponse({success:true, orders: orders.reverse()}); // newest first
}

function getOrCreateOrderSheet() {
  const ss    = getIBISpreadsheet();
  let   sheet = ss.getSheetByName(ORDER_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ORDER_SHEET);
    sheet.appendRow([
      'Timestamp','Order ID','Customer Name','Customer Mobile',
      'Customer Email','Address','Items (JSON)','Total (₹)',
      'IBI Commission (₹)','Seller Payouts (JSON)','Status',
      'Order Date','Payout Status','Payout Date'
    ]);
    sheet.getRange(1,1,1,14).setBackground('#131921').setFontColor('#fff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(OCOL.ITEMS,           200);
    sheet.setColumnWidth(OCOL.SELLER_PAYOUTS,  200);
    sheet.setColumnWidth(OCOL.ADDRESS,         200);
    // Status dropdown
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Placed','Confirmed','Packed','Shipped','Delivered','Cancelled','Returned']).build();
    sheet.getRange(2, OCOL.STATUS, 1000, 1).setDataValidation(statusRule);
    // Payout status dropdown
    const payoutRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending','Processing','Paid']).build();
    sheet.getRange(2, OCOL.PAYOUT_STATUS, 1000, 1).setDataValidation(payoutRule);
  }
  return sheet;
}


// ── Order status & payout update helpers ─────────────────
function adminUpdateOrderPayout(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateOrderSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][OCOL.ORDER_ID-1]||'') === p.orderId) {
      sheet.getRange(i+1, OCOL.PAYOUT_STATUS, 1, 1).setValue(p.payoutStatus||'Paid').setBackground('#C8E6C9');
      if (p.payoutDate) sheet.getRange(i+1, OCOL.PAYOUT_DATE, 1, 1).setValue(p.payoutDate);
      return jsonResponse({success:true, message:'Payout updated'});
    }
  }
  return jsonResponse({success:false, message:'Order not found'});
}

function adminUpdateOrderStatus(p) {
  if (!verifyAdmin(p)) return jsonResponse({success:false,message:'Unauthorized'});
  const sheet = getOrCreateOrderSheet();
  const data  = sheet.getDataRange().getValues();
  const statusColors = {
    'Placed':'#FFF9C4','Confirmed':'#DBEAFE','Packed':'#F3E8FF',
    'Shipped':'#FFF7ED','Delivered':'#C8E6C9','Cancelled':'#FFCDD2','Returned':'#FFCDD2'
  };
  for (let i = 1; i < data.length; i++) {
    if ((data[i][OCOL.ORDER_ID-1]||'') === p.orderId) {
      const bg = statusColors[p.status] || '#FFF9C4';
      sheet.getRange(i+1, OCOL.STATUS, 1, 1).setValue(p.status||'Placed').setBackground(bg);
      return jsonResponse({success:true, message:'Status updated to '+p.status});
    }
  }
  return jsonResponse({success:false, message:'Order not found'});
}


// ============================================================
// ZOHO PAYMENTS INTEGRATION
// ============================================================
// ── Zoho Payments — OAuth (Server-based App) ──
const ZOHO_CLIENT_ID     = '1000.IPWZAM18UG8QW6NO2DRG6DX974WWIG';
const ZOHO_CLIENT_SECRET = '015e05a64d04de8b2cc2332dae462f3e8e252c6be9';
const ZOHO_REFRESH_TOKEN = '1000.46ccb76842c19a601343d95de586ca81.617b6e13857c0d06eb6017f41e90e7c8';
const ZOHO_ACCOUNT_ID    = '60056198992';
const IBI_SITE_URL       = 'https://www.indiabusinessinternational.online';

function getZohoAccessToken() {
  var res = UrlFetchApp.fetch('https://accounts.zoho.in/oauth/v2/token', {
    method: 'post',
    payload: {
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id:     ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type:    'refresh_token'
    },
    muteHttpExceptions: true
  });
  var data = JSON.parse(res.getContentText());
  if (!data.access_token) throw new Error('Token error: ' + res.getContentText());
  return data.access_token;
}

function createZohoPaymentLink(p) {
  try {
    var amount  = parseFloat(p.amount || '0');
    var orderId = (p.orderId || ('IBI' + Date.now().toString().slice(-8))).toString().trim();
    var email   = (p.email || '').trim();
    var phone   = (p.phone || '').trim();

    if (!amount || amount <= 0) return jsonResponse({success:false, error:'Invalid amount'});

    var payload = {
      amount:       amount,
      currency:     'INR',
      description:  'IBI Marketplace Order #' + orderId,
      reference_id: orderId,
      return_url:   IBI_SITE_URL + '/?payment=success'
    };
    if (email) payload.email = email;
    if (phone && /^[0-9]{10}$/.test(phone)) {
      payload.phone              = phone;
      payload.phone_country_code = 'IN';
    }

    Logger.log('Payload: ' + JSON.stringify(payload));

    // Use API Key authentication (simpler, no OAuth needed)
    var accessToken = getZohoAccessToken();
    var res = UrlFetchApp.fetch(
      'https://payments.zoho.in/api/v1/paymentlinks?account_id=' + ZOHO_ACCOUNT_ID, {
      method:  'post',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type':  'application/json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var responseText = res.getContentText();
    Logger.log('Zoho response (' + res.getResponseCode() + '): ' + responseText);
    var result = JSON.parse(responseText);

    if (result.payment_links && result.payment_links.url) {
      return jsonResponse({
        success:       true,
        paymentUrl:    result.payment_links.url,
        paymentLinkId: result.payment_links.payment_link_id,
        orderId:       orderId
      });
    }
    return jsonResponse({success: false, error: JSON.stringify(result)});

  } catch(err) {
    Logger.log('createZohoPaymentLink error: ' + err.toString());
    return jsonResponse({success: false, error: err.toString()});
  }
}

// ── DIAGNOSTIC: Run this to find correct Zoho Payments Account ID ──
function testZohoAccountId() {
  try {
    Logger.log('Using API Key: ' + ZOHO_API_KEY.substring(0,20) + '...');

    // Try listing accounts
    var res = UrlFetchApp.fetch('https://payments.zoho.in/api/v1/accounts', {
      method: 'get',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + ZOHO_API_KEY
      },
      muteHttpExceptions: true
    });
    Logger.log('Accounts response (' + res.getResponseCode() + '): ' + res.getContentText());

    // Also try without account ID header
    var res2 = UrlFetchApp.fetch('https://payments.zoho.in/api/v1/paymentlinks?count=1', {
      method: 'get',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + ZOHO_API_KEY,
        'X-Zoho-Pay-Account-ID': ZOHO_ACCOUNT_ID
      },
      muteHttpExceptions: true
    });
    Logger.log('PaymentLinks test (' + res2.getResponseCode() + '): ' + res2.getContentText());

  } catch(err) {
    Logger.log('Error: ' + err.toString());
  }
}


// ============================================================
// VISITOR ANALYTICS
// ============================================================
function trackVisit(p) {
  try {
    var ss    = getIBISpreadsheet();
    var sheet = ss.getSheetByName('Analytics');
    if (!sheet) {
      sheet = ss.insertSheet('Analytics');
      sheet.appendRow(['Timestamp','Date','Page','Referrer','Device']);
      sheet.getRange(1,1,1,5).setBackground('#131921').setFontColor('#fff').setFontWeight('bold');
    }
    var today = new Date().toLocaleDateString('en-IN');
    sheet.appendRow([new Date().toLocaleString('en-IN'), today, p.page||'/', p.referrer||'direct', p.device||'Unknown']);
    return jsonResponse({success:true});
  } catch(e) {
    Logger.log('trackVisit error: ' + e);
    return jsonResponse({success:false});
  }
}

// ============================================================
// SELLER ORDER DASHBOARD — fetch orders for seller's products
// ============================================================
function getSellerOrders(p) {
  if (!verifySellerPin(p.sellerId, p.pin)) return jsonResponse({success:false, message:'Unauthorized'});
  try {
    var ss         = getIBISpreadsheet();
    var orderSheet = ss.getSheetByName('Orders');
    var prodSheet  = ss.getSheetByName('Products');

    if (!orderSheet) return jsonResponse({success:true, orders:[]});

    // Get all product titles for this seller
    var sellerProds = [];
    if (prodSheet) {
      var prodData = prodSheet.getDataRange().getValues();
      for (var i = 1; i < prodData.length; i++) {
        if ((prodData[i][PCOL.SELLER_ID-1]||'').toUpperCase() === p.sellerId.toUpperCase()) {
          sellerProds.push((prodData[i][PCOL.TITLE-1]||'').toLowerCase());
        }
      }
    }

    // Get all orders, filter those containing seller's products
    var orderData = orderSheet.getDataRange().getValues();
    var orders = [];
    for (var j = 1; j < orderData.length; j++) {
      var row = orderData[j];
      var itemsStr = (row[4]||'').toString().toLowerCase();
      // Check if any seller product appears in the order items
      var isSellerOrder = sellerProds.some(function(prod) {
        return prod && itemsStr.indexOf(prod.substring(0,20)) !== -1;
      });
      // Also include if sellerId appears in order (for future direct linking)
      if (!isSellerOrder && sellerProds.length === 0) isSellerOrder = true; // show all if no products listed yet

      if (isSellerOrder || sellerProds.length === 0) {
        orders.push({
          orderId:  row[1] || '',
          date:     row[0] ? new Date(row[0]).toLocaleDateString('en-IN') : '',
          customer: row[2] || '',
          items:    row[4] || '',
          total:    row[6] || '',
          address:  row[5] || '',
          status:   row[7] || 'Placed'
        });
      }
    }
    // Return latest 50 orders, newest first
    orders = orders.reverse().slice(0, 50);
    return jsonResponse({success:true, orders:orders});
  } catch(e) {
    Logger.log('getSellerOrders error: ' + e);
    return jsonResponse({success:false, error:e.toString()});
  }
}

// ============================================================
// CUSTOMER SUPPORT TICKET SYSTEM
// ============================================================
function saveTicket(p) {
  try {
    var ss    = getIBISpreadsheet();
    var sheet = ss.getSheetByName('Support');
    if (!sheet) {
      sheet = ss.insertSheet('Support');
      sheet.appendRow(['Timestamp','Ticket ID','Name','Contact','Order ID','Issue Type','Description','Status']);
      sheet.getRange(1,1,1,8).setBackground('#7C3AED').setFontColor('#fff').setFontWeight('bold');
    }
    sheet.appendRow([
      new Date().toLocaleString('en-IN'),
      p.ticketId || ('TKT-'+Date.now().toString().slice(-8)),
      p.name    || '',
      p.contact || '',
      p.orderId || '',
      p.type    || '',
      p.desc    || '',
      'Open'
    ]);

    // Notify IBI via email
    try {
      MailApp.sendEmail({
        to: 'indiabusinessinternational@gmail.com',
        subject: '🎫 New Support Ticket: ' + (p.type||'General') + ' [' + p.ticketId + ']',
        htmlBody: '<h3>New Support Ticket — IBI Marketplace</h3>' +
          '<table style="border-collapse:collapse;width:100%;">' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Ticket ID</td><td style="padding:8px;border:1px solid #ddd;">' + p.ticketId + '</td></tr>' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Customer</td><td style="padding:8px;border:1px solid #ddd;">' + (p.name||'') + '</td></tr>' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Contact</td><td style="padding:8px;border:1px solid #ddd;">' + (p.contact||'') + '</td></tr>' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Order ID</td><td style="padding:8px;border:1px solid #ddd;">' + (p.orderId||'N/A') + '</td></tr>' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Issue</td><td style="padding:8px;border:1px solid #ddd;">' + (p.type||'') + '</td></tr>' +
          '<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700;">Description</td><td style="padding:8px;border:1px solid #ddd;">' + (p.desc||'') + '</td></tr>' +
          '</table>' +
          '<p style="margin-top:16px;color:#888;font-size:12px;">Respond via WhatsApp or Email to the customer contact above.</p>'
      });
    } catch(mailErr) { Logger.log('Ticket email error: ' + mailErr); }

    return jsonResponse({success:true, ticketId:p.ticketId});
  } catch(e) {
    Logger.log('saveTicket error: ' + e);
    return jsonResponse({success:false, error:e.toString()});
  }
}

// ============================================================
// IMAGE UPLOAD — base64 → Google Drive → public https:// URL
// ============================================================
function uploadImageToDrive(p) {
  try {
    var b64      = p.data     || '';
    var mimeType = p.mimeType || 'image/jpeg';
    var filename = p.filename || ('ibi_img_' + Date.now() + '.jpg');

    if (!b64) return jsonResponse({success:false, error:'No image data'});

    // Decode base64 and create blob
    var decoded = Utilities.base64Decode(b64);
    var blob    = Utilities.newBlob(decoded, mimeType, filename);

    // Get or create IBI Product Images folder in Drive
    var folderName = 'IBI Product Images';
    var folders    = DriveApp.getFoldersByName(folderName);
    var folder     = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // Save file
    var file = folder.createFile(blob);

    // Make publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Return a URL that actually renders inside <img>.
    // NOTE: Google's old  uc?export=view  endpoint no longer serves image bytes for
    // hotlinking (it returns an HTML/redirect page), which silently broke product
    // images. The  thumbnail?id=…  endpoint serves the image for publicly-shared
    // files. sz=w1600 is ample for product photos (uploads are compressed to ~900px).
    var fileId  = file.getId();
    var viewUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';

    Logger.log('Image uploaded: ' + viewUrl);
    return jsonResponse({success:true, url:viewUrl, fileId:fileId});

  } catch(err) {
    Logger.log('uploadImageToDrive error: ' + err.toString());
    return jsonResponse({success:false, error:err.toString()});
  }
}

// ── Run this ONCE to authorise DriveApp and test image upload ──
function testDriveImageUpload() {
  try {
    // Create a tiny test image (1x1 white PNG, base64)
    var testB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';
    var decoded = Utilities.base64Decode(testB64);
    var blob    = Utilities.newBlob(decoded, 'image/png', 'test_ibi.png');
    var folders = DriveApp.getFoldersByName('IBI Product Images');
    var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('IBI Product Images');
    var file    = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
    Logger.log('✅ Drive upload works! Test URL: ' + url);
    Logger.log('Folder: ' + folder.getName() + ' (' + folder.getId() + ')');
    return url;
  } catch(e) {
    Logger.log('❌ Drive upload error: ' + e.toString());
    throw e;
  }
}

// =============================================================
//  ONE-TIME MIGRATION  —  realign legacy Product rows
// -------------------------------------------------------------
//  Older rows stored Status in column 15 (18-column layout).
//  Current layout stores Status in column 20 (23-column layout)
//  with Additional Images / Tags / Dimensions / Variations
//  inserted in the middle.
//
//  HOW TO RUN (once):
//    1. BACK UP FIRST — right-click the "Products" tab → Duplicate.
//    2. In the Apps Script editor, select migrateProductRows
//       from the function dropdown and click Run.
//    3. It only touches rows that look like the OLD layout and is
//       safe to re-run (idempotent).
//
//  If your products tab is named something other than "Products",
//  change PRODUCTS_SHEET_NAME below.
// =============================================================
const PRODUCTS_SHEET_NAME = 'Products';

function migrateProductRows() {
  const sheet = getIBISpreadsheet().getSheetByName(PRODUCTS_SHEET_NAME);
  if (!sheet) { Logger.log('❌ Sheet "' + PRODUCTS_SHEET_NAME + '" not found.'); return; }

  const data = sheet.getDataRange().getValues();
  const STATUSES = ['Pending','Approved','Rejected','Paused'];
  let migrated = 0;

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const col20 = (r[19] != null ? r[19] : '').toString().trim(); // new status position
    const col15 = (r[14] != null ? r[14] : '').toString().trim(); // old status position

    // Old-layout row: status sits at col 15 and the new status cell (col 20) is empty.
    if (col20 === '' && STATUSES.indexOf(col15) > -1) {
      const row = i + 1;
      const oldDesc     = r[10];  // old col 11
      const oldBullets  = r[11];  // old col 12
      const oldStock    = r[12];  // old col 13
      const oldHsn      = r[13];  // old col 14
      const oldStatus   = r[14];  // old col 15
      const oldReject   = r[15];  // old col 16
      const oldApproved = r[16];  // old col 17
      const oldUpdated  = r[17];  // old col 18

      // Rewrite columns 11..23 into the new layout in one operation
      sheet.getRange(row, 11, 1, 13).setValues([[
        '',            // 11 Additional Images
        oldDesc,       // 12 Description
        oldBullets,    // 13 Bullets
        oldStock,      // 14 Stock
        oldHsn,        // 15 HSN
        '',            // 16 Tags
        '',            // 17 Product Dimensions
        '',            // 18 Package Dimensions
        '[]',          // 19 Variations
        oldStatus,     // 20 Status
        oldReject,     // 21 Reject Reason
        oldApproved,   // 22 Approved On
        oldUpdated     // 23 Updated On
      ]]);

      // Re-apply the status highlight on the correct (new) status cell
      const bg = oldStatus === 'Approved' ? '#C8E6C9'
               : oldStatus === 'Rejected' ? '#FFCDD2'
               : oldStatus === 'Paused'   ? '#CFD8DC' : '#FFF9C4';
      sheet.getRange(row, PCOL.STATUS, 1, 1).setBackground(bg);
      migrated++;
    }
  }

  // Set / refresh the header row to the correct 23-column layout
  sheet.getRange(1, 1, 1, 23).setValues([[
    'Timestamp','Product ID','Seller ID','Business Name','Title','Category',
    'Brand','Price','MRP','Image','Additional Images','Description','Bullets',
    'Stock','HSN','Tags','Product Dimensions','Package Dimensions','Variations',
    'Status','Reject Reason','Approved On','Updated On'
  ]]);

  Logger.log('✅ Migration complete. Rows realigned: ' + migrated);
  SpreadsheetApp.getActiveSpreadsheet().toast('Migration complete. Rows realigned: ' + migrated, 'IBI', 6);
}
