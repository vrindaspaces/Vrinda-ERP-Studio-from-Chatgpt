import {uploadToDrive,readDriveFile,deleteDriveFile} from './google-drive';
import {imageType} from './logo';
const json=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export async function supplierInvoices(request:Request,env:any,actor:any,data:any){
 if(!actor)return json({error:'Please sign in.'},401);if(actor.role!=='Owner')return json({error:'Only the Owner can manage supplier invoices.'},403);
 const path=new URL(request.url).pathname,match=path.match(/^\/api\/supplier-invoices\/([^/]+)\/file$/);
 if(match&&request.method==='GET'){const invoice=data.supplierInvoices.find((i:any)=>i.id===decodeURIComponent(match[1]));const file=invoice?.attachment;if(!file)return json({error:'Invoice file not found.'},404);try{const object=await readDriveFile(env,file.driveFileId);return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'}});}catch{return json({error:'The invoice file is unavailable. Check the Google Drive connection.'},503);}}
 if(path!=='/api/supplier-invoices')return json({error:'Not found'},404);
 if(request.method==='GET')return json({invoices:data.supplierInvoices});
 if(!['POST','DELETE'].includes(request.method))return json({error:'Method not allowed'},405);
 let input:any,file:File|null=null;
 if(request.method==='DELETE')input=await request.json();else{if(Number(request.headers.get('content-length'))>11*1024*1024)return json({error:'Choose a file no larger than 10 MB.'},413);const form=await request.formData();try{input=JSON.parse(String(form.get('invoice')));}catch{return json({error:'Invalid invoice details.'},400);}const upload=form.get('file');if(upload instanceof File&&upload.size)file=upload;}
 const existing=input.id?data.supplierInvoices.find((i:any)=>i.id===input.id):null;if(input.id&&!existing)return json({error:'Invoice not found. Refresh and retry.'},404);
 if(existing&&input.updatedAt!==existing.updatedAt)return json({error:'This invoice changed. Refresh and retry.'},409);
 if(request.method==='DELETE'&&!existing)return json({error:'Choose an existing invoice.'},400);
 let invoice:any,location:any;
 if(request.method==='POST'){
  const vendor=data.vendors.find((v:any)=>v.id===input.vendorId),project=data.projects.find((p:any)=>p.id===input.projectId),po=input.purchaseOrderId?data.purchaseOrders.find((p:any)=>p.id===input.purchaseOrderId):null;
  if(!vendor||!project||input.purchaseOrderId&&(!po||po.vendorId!==vendor.id||po.projectId!==project.id))return json({error:'Choose an existing supplier, project and matching purchase order.'},400);
  if(existing?.payments&&input.payments===undefined)return json({error:'Include the invoice payment history when saving.'},400);
  let payments:any[]|undefined;
  if(input.payments!==undefined){
   if(!Array.isArray(input.payments)||input.payments.length>200)return json({error:'Enter a valid payment list (up to 200 entries).'},400);
   const ids=new Set();payments=[];
   for(const payment of input.payments){const legacyId=existing?'legacy-'+existing.id:'';
    const legacy=payment?.id===legacyId&&(existing.payments?.some((p:any)=>p.id===legacyId)||!existing.payments&&existing.paidAmount>0);
    if(!payment||typeof payment.id!=='string'||!payment.id||payment.id.length>100||ids.has(payment.id)||(!validDate(payment.date)&&!(legacy&&payment.date===''))||typeof payment.amount!=='number'||!Number.isFinite(payment.amount)||payment.amount<=0||payment.amount>1e12||(!['Bank Transfer','UPI','Cheque','Cash'].includes(payment.method)&&!(legacy&&payment.method===''))||typeof payment.reference!=='string'||payment.reference.length>100)return json({error:'Each payment needs a date, positive amount and valid payment method. References may be up to 100 characters.'},400);
    ids.add(payment.id);payments.push({id:payment.id,date:payment.date,amount:Math.round(payment.amount*100)/100,method:payment.method,reference:payment.method==='Cash'?'':payment.reference.trim()});
   }
   input.paidAmount=Math.round(payments.reduce((sum,p)=>sum+p.amount,0)*100)/100;
  }
  const number=typeof input.invoiceNumber==='string'?input.invoiceNumber.trim():'';const amounts=[input.taxableAmount,input.taxAmount,input.paidAmount];
  if(!number||number.length>100||!validDate(input.invoiceDate)||input.dueDate&&(!validDate(input.dueDate)||input.dueDate<input.invoiceDate)||amounts.some(a=>typeof a!=='number'||!Number.isFinite(a)||a<0||a>1e12)||input.taxableAmount+input.taxAmount<=0||input.paidAmount>input.taxableAmount+input.taxAmount)return json({error:'Enter a valid invoice number, dates and amounts. Paid amount cannot exceed the total.'},400);
  if(data.supplierInvoices.some((i:any)=>i.id!==existing?.id&&i.vendorId===vendor.id&&i.invoiceNumber.trim().toLowerCase()===number.toLowerCase()))return json({error:'This supplier invoice number is already recorded.'},409);
  if(typeof input.notes!=='string'||input.notes.length>2000)return json({error:'Notes must be no longer than 2,000 characters.'},400);
  if(existing?.attachment&&project.id!==existing.projectId)return json({error:'The attached file belongs to its existing project. Create a new invoice to use another project.'},400);
  const paymentMethod=input.paymentMethod??'',reference=input.paymentReference??'';
  if(typeof paymentMethod!=='string'||!['','Bank Transfer','UPI','Cheque','Cash'].includes(paymentMethod)||typeof reference!=='string'||reference.length>100)return json({error:'Choose a valid payment method and a reference no longer than 100 characters.'},400);
  const paymentReference=['Bank Transfer','UPI','Cheque'].includes(paymentMethod)?reference.trim():'';
  const now=new Date().toISOString();invoice={id:existing?.id||crypto.randomUUID(),vendorId:vendor.id,vendorName:vendor.name,projectId:project.id,projectName:project.title,purchaseOrderId:po?.id||'',invoiceNumber:number,invoiceDate:input.invoiceDate,dueDate:input.dueDate||'',taxableAmount:input.taxableAmount,taxAmount:input.taxAmount,totalAmount:Math.round((input.taxableAmount+input.taxAmount)*100)/100,paidAmount:input.paidAmount,...(payments?{payments}:{}),paymentMethod,paymentReference,notes:input.notes,createdAt:existing?.createdAt||now,updatedAt:now,...(existing?.attachment?{attachment:existing.attachment}:{})};
  if(file){if(file.size>10*1024*1024)return json({error:'Choose a file no larger than 10 MB.'},413);const bytes=new Uint8Array(await file.arrayBuffer()),type=imageType(bytes)||new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'&&'application/pdf';if(!type)return json({error:'Choose a PDF, PNG, JPEG or WebP invoice.'},400);try{location=await uploadToDrive(env,project,{id:'supplier-invoice-'+invoice.id},crypto.randomUUID(),new File([bytes],file.name,{type}));invoice.attachment={...location,name:file.name.slice(0,200),size:file.size,type};}catch(error){return json({error:error instanceof Error?error.message:'Google Drive upload failed.'},503);}}
 }
 let saved=false;try{for(let attempt=0;attempt<5;attempt++){const row=(await env.DB.prepare("SELECT value,revision FROM erp_collections WHERE key='supplierInvoices'").all()).results[0];const previous=JSON.parse(row.value),current=existing?previous.find((i:any)=>i.id===existing.id):null;
 if(existing&&current?.updatedAt!==existing.updatedAt)return json({error:'This invoice changed. Refresh and retry.'},409);
 if(invoice&&previous.some((i:any)=>i.id!==invoice.id&&i.vendorId===invoice.vendorId&&i.invoiceNumber.trim().toLowerCase()===invoice.invoiceNumber.toLowerCase()))return json({error:'This supplier invoice number is already recorded.'},409);
 const next=request.method==='DELETE'?previous.filter((i:any)=>i.id!==existing.id):existing?previous.map((i:any)=>i.id===invoice.id?invoice:i):[invoice,...previous];
 const result=await env.DB.prepare("UPDATE erp_collections SET value=?,revision=revision+1 WHERE key='supplierInvoices' AND revision=?").bind(JSON.stringify(next),row.revision).run();if(!result.meta.changes)continue;saved=true;
 if(file&&existing?.attachment)try{await deleteDriveFile(env,existing.attachment.driveFileId);}catch{console.error('Unused supplier invoice file cleanup failed');}
 return json({success:true,invoice});}return json({error:'Invoices changed. Please retry.'},409);}finally{if(!saved&&location)try{await deleteDriveFile(env,location.driveFileId);}catch{console.error('Supplier invoice upload cleanup failed');}}
}
