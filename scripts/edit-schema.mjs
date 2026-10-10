import ts from 'typescript-parser';
import {readFileSync,writeFileSync} from 'node:fs';
const source=ts.createSourceFile('index.ts',readFileSync('src/types/index.ts','utf8'),ts.ScriptTarget.Latest,true);
const declarations=new Map(source.statements.filter(n=>ts.isInterfaceDeclaration(n)||ts.isTypeAliasDeclaration(n)).map(n=>[n.name.text,n]));
function schema(node,seen=new Set()) {
 if(!node)return {kind:'string'};
 if(node.kind===ts.SyntaxKind.NumberKeyword)return {kind:'number'};
 if(node.kind===ts.SyntaxKind.BooleanKeyword)return {kind:'boolean'};
 if(ts.isLiteralTypeNode(node))return {kind:ts.isNumericLiteral(node.literal)?'number':'string',options:[ts.isNumericLiteral(node.literal)?Number(node.literal.text):node.literal.text]};
 if(ts.isUnionTypeNode(node)) {
  const parts=node.types.map(n=>schema(n,seen));
  const free=parts.find(part=>!part.options);
  if(free)return free;
  const options=[...new Set(parts.flatMap(part=>part.options))];
  return {kind:typeof options[0]==='number'?'number':'string',options};
 }
 if(ts.isArrayTypeNode(node))return {kind:'array',item:schema(node.elementType,seen)};
 if(ts.isTypeReferenceNode(node)) {
  const name=node.typeName.getText(source);
  if(name==='Array')return {kind:'array',item:schema(node.typeArguments[0],seen)};
  if(name==='Record')return {kind:'object',fields:{}};
  const declaration=declarations.get(name);
  if(!declaration||seen.has(name))return {kind:'string'};
  const next=new Set([...seen,name]);
  return ts.isInterfaceDeclaration(declaration)?object(declaration.members,next):schema(declaration.type,next);
 }
 if(ts.isTypeLiteralNode(node))return object(node.members,seen);
 return {kind:'string'};
}
function object(members,seen) {
 return {kind:'object',fields:Object.fromEntries(members.filter(ts.isPropertySignature).map(m=>[m.name.getText(source),{...schema(m.type,seen),optional:!!m.questionToken}]))};
}
const names={companyProfile:'CompanyProfile',clients:'Client',projects:'Project',employees:'Employee',tasks:'Task',leaveRequests:'LeaveRequest',attendance:'AttendanceRecord',payslips:'Payslip',vendors:'Vendor',purchaseOrders:'PurchaseOrder',inventory:'InventoryItem',quotations:'Quotation',invoices:'ClientInvoice',clientPayments:'ClientPaymentRecord',expenses:'Expense',notifications:'AppNotification'};
const result=Object.fromEntries(Object.entries(names).map(([collection,name])=>[collection,object(declarations.get(name).members,new Set([name]))]));
writeFileSync('src/context/editSchemas.generated.json',JSON.stringify(result,null,2)+'\n');
