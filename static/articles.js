
const categories=[{id:'company',name:'우리회사 뉴스'},{id:'policy',name:'정책'},{id:'hospital',name:'학회&병원'},{id:'competitor',name:'경쟁사'}];
let articles = [];
function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function card(a){let track='';if(a.track){track='<details class="policy"><summary>정책 추적 예시 · '+esc(a.track.name)+'</summary><dl><dt>이전 기록</dt><dd>'+esc(a.track.before)+'</dd><dt>이번 기사에서 확인할 내용</dt><dd>'+esc(a.track.change)+'</dd><dt>다음 확인 사항</dt><dd>'+esc(a.track.next)+'</dd></dl><p class="policy-note">공식 자료 검증 및 자동 이력 비교 전의 화면 예시입니다.</p></details>';}
return '<article class="card"><div class="meta"><span class="entity">'+esc(a.entity)+'</span><span>'+esc(a.source)+' · '+esc(a.date)+'</span></div><h3>'+esc(a.title)+'</h3><p class="summary" style="white-space:pre-line">'+esc((a.subtitle?a.subtitle+'\n\n':'')+a.summary)+'</p><div class="tags">'+a.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>'+track+'<a class="source" href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></article>';}
const PAGE_SIZE=6;
const visibleCounts={};
function resetVisibleCounts(){categories.forEach(function(c){visibleCounts[c.id]=PAGE_SIZE;});}
function matchesTopic(a,topic){
 if(!topic)return true;
 const text=[a.title].concat(a.tags||[]).join(' ');
 if(topic==='AI')return /(?:\bAI\b|인공지능)/i.test(text);
 if(topic==='CT')return /(?:\bCT\b|CT(?=[가-힣])|컴퓨터단층|전산화단층)/i.test(text);
 if(topic==='MR')return /(?:\bMRI?\b|MRI?(?=[가-힣])|자기공명)/i.test(text);
 if(topic==='초음파')return /초음파|ultrasound/i.test(text);
 if(topic==='학회')return /학회|학술대회|학술회의|심포지엄|symposium|congress|conference/i.test(text);
 return false;
}
function render(){
 const q=document.getElementById('search').value.trim().toLocaleLowerCase();
 const topic=document.getElementById('topic').value;
 const includeMain=document.getElementById('include-main').checked;
 const matches=articles.filter(function(a){
  const text=[a.title,a.entity,a.source,a.summary].concat(a.tags).join(' ').toLocaleLowerCase();
  return (a.match_level!=='main'||includeMain)&&(!q||text.includes(q))&&matchesTopic(a,topic);
 });
 document.getElementById('sections').innerHTML=categories.map(function(c,i){
  const rows=matches.filter(function(a){return a.category===c.id;}).sort(function(a,b){return Number(a.match_level==='main')-Number(b.match_level==='main')||b.date.localeCompare(a.date);});
  const shown=rows.slice(0,visibleCounts[c.id]||PAGE_SIZE);
  const empty='최신 기사가 없습니다.';
  const more=shown.length<rows.length?'<div class="more-wrap"><button type="button" class="more-button" data-more="'+c.id+'" aria-label="'+esc(c.name)+' 기사 더보기">더보기</button></div>':'';
  const count=shown.length<rows.length?shown.length+' / '+rows.length+'건':rows.length+'건';
  return '<section class="section" id="'+c.id+'"><div class="section-head"><h2><span>0'+(i+1)+'</span>'+c.name+'</h2><span class="count">'+count+'</span></div><div class="grid">'+(shown.length?shown.map(card).join(''):'<div class="empty">'+empty+'</div>')+'</div>'+more+'</section>';
 }).join('');
}
function changeFilters(){resetVisibleCounts();render();}
document.getElementById('search').addEventListener('input',changeFilters);
document.getElementById('topic').addEventListener('change',changeFilters);
document.getElementById('include-main').addEventListener('change',changeFilters);
document.getElementById('sections').addEventListener('click',function(event){
 const button=event.target.closest('button[data-more]');if(!button)return;
 const category=button.getAttribute('data-more');if(!categories.some(function(c){return c.id===category;}))return;
 visibleCounts[category]=(visibleCounts[category]||PAGE_SIZE)+PAGE_SIZE;render();
});
async function refreshArticles(){const r=await fetch('/api/articles');if(!r.ok)throw new Error('Article loading failed');articles=(await r.json()).articles;changeFilters();}
refreshArticles().catch(function(e){document.getElementById('sections').textContent=e.message;});
