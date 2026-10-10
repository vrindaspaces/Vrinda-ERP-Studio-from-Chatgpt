const normal=(value:string)=>value.trim().replace(/\s+/g,' ').toLowerCase();
export function inventoryForReceipts(before:any[],after:any[],inventory:any[]){
 const next=inventory.map(item=>({...item}));let changed=false;
 const previous=new Map(before.map(po=>[po.id,po]));
 for(const po of after){if(!Array.isArray(po.items))throw Error('Purchase order items are invalid.');const old=previous.get(po.id);
  for(const item of po.items){if(typeof item.description!=='string'||!item.description.trim()||typeof item.unit!=='string'||!item.unit.trim()||!Number.isFinite(item.orderedQty)||item.orderedQty<0||!Number.isFinite(item.receivedQty)||item.receivedQty<0||item.receivedQty>item.orderedQty||!Number.isFinite(item.unitPrice)||item.unitPrice<0)throw Error('Enter valid PO quantities, units and prices. Received quantity cannot exceed ordered quantity.');
   const prior=old?.items.find((line:any)=>line.id===item.id);const delta=Math.round((item.receivedQty-(prior?.receivedQty||0))*1000000)/1000000;if(!delta)continue;
   const material=prior&&delta<0?prior:item;
   let stock=next.find(inv=>normal(inv.name)===normal(material.description)&&normal(inv.unit)===normal(material.unit));
   if(!stock){if(delta<0)throw Error('The original received material is missing from inventory. Restore it before correcting the receipt.');stock={id:'inv-'+crypto.randomUUID(),name:item.description.trim(),category:'Other Materials',unit:item.unit.trim(),currentStock:0,reorderLevel:0,unitCost:item.unitPrice,location:po.projectTitle||'Project site',lastRestocked:''};next.push(stock);}
   if(!Number.isFinite(stock.currentStock)||stock.currentStock+delta<0)throw Error('This receipt correction would make inventory stock negative. Check stock usage first.');
   stock.currentStock=Math.round((stock.currentStock+delta)*1000000)/1000000;stock.lastRestocked=new Date().toISOString().slice(0,10);changed=true;
  }
 }
 return changed?next:null;
}
