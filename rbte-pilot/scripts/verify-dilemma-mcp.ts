import assert from 'node:assert/strict';
import { retrieveDilemmaEvidence } from '../lib/pack-toc-mcp';
import { evaluateDilemmaCloud } from '../lib/dilemma-review-ai';
import { reviewConfig } from '../lib/review-openai';
async function main(){
const {retrieval}=await retrieveDilemmaEvidence();
assert.equal(retrieval.transport,'mcp-stdio');
console.log(JSON.stringify({mcp:'ok',server:retrieval.server,commit:retrieval.commit,sourceIds:retrieval.sourceIds}));
if(process.argv.includes('--live-ai')){
 const report=await evaluateDilemmaCloud({profile:'DILEMMA',signal:'Синтетический тест установки. Выбираю между отправкой отчёта сегодня и проверкой перед отправкой завтра.'},[{step:'cloud',fields:{actionA:'Отправить отчёт сегодня',actionB:'Проверить отчёт до отправки завтра',needA:'Отправить отчёт сегодня',needB:'Обеспечить точность данных',goal:'Купить велосипед'}}],reviewConfig());
 assert.equal(report.semantic?.links.length,7);
 assert.ok(report.issues.some(i=>i.field==='goal'||i.link==='ab'||i.link==='ac'),'Semantic check must flag the unrelated goal or its unsupported necessity links');
 console.log(JSON.stringify({semantic:'ok',checkedLinks:report.semantic.links.length,issues:report.issues.length,model:report.semantic.verification?.model,passes:report.semantic.verification?.passes,syntheticDataOnly:true}));
}
}
main().catch((error)=>{
 const known=/^(Provider unavailable \(HTTP \d{3}\)|Incomplete semantic review|Semantic review refused|Response too large|Empty response)$/;
 console.error(JSON.stringify({semantic:'failed',category:error?.name,reason:known.test(error?.message||'')?error.message:undefined,assertion:error?.code==='ERR_ASSERTION'?'Expected semantic objection to the synthetic unrelated goal':undefined,validation:Array.isArray(error?.issues)?error.issues.map((i:any)=>({path:i.path,code:i.code})):undefined}));
 process.exitCode=1;
});
