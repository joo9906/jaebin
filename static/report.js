(function(){
 // 주간 리포트: 버튼을 누르면 서버가 GPT로 최근 7일 리포트를 만들어 돌려줍니다.
 const button=document.getElementById('report-button');
 const copyButton=document.getElementById('report-copy');
 const statusBox=document.getElementById('report-status');
 const output=document.getElementById('report-output');
 button.addEventListener('click',async function(){
  button.disabled=true;copyButton.hidden=true;output.textContent='';
  statusBox.textContent='리포트를 만드는 중입니다… (최대 2분 정도 걸릴 수 있어요)';
  try{
   const r=await fetch('/api/weekly-report',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'리포트를 만들지 못했습니다.');
   statusBox.textContent=d.since+' ~ '+d.until+' · '+(d.only_starred?'⭐ 기사 ':'기사 ')+d.article_count+'건으로 작성';
   output.textContent=d.report;copyButton.hidden=false;
  }catch(e){statusBox.textContent=e.message;}
  finally{button.disabled=false;}
 });
 copyButton.addEventListener('click',async function(){
  try{await navigator.clipboard.writeText(output.textContent);statusBox.textContent='복사했습니다. 메일이나 문서에 붙여 넣으세요.';}
  catch(e){statusBox.textContent='복사하지 못했습니다. 글을 직접 드래그해서 복사해 주세요.';}
 });
})();
