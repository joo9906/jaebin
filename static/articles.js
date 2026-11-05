
const categories=[{id:'company',name:'우리회사 뉴스'},{id:'policy',name:'정책'},{id:'hospital',name:'학회&병원'},{id:'competitor',name:'경쟁사'}];
let articles = [];
function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
// NEW 표시: 지난번 방문 때 본 가장 최근 저장 시각입니다. 이보다 나중에 저장된 기사에 NEW를 붙입니다.
let lastSeen='';
try{lastSeen=localStorage.getItem('lastSeenSavedAt')||'';}catch(e){}
function isNew(a){return lastSeen!==''&&a.saved_at>lastSeen;}
// 검색어 강조: 지금 검색창에 쓴 단어입니다. 카드 글에서 이 단어를 찾아 <mark>로 감싸 노란색으로 보여줍니다.
let searchWord='';
function highlight(value){
 const text=String(value);
 if(!searchWord)return esc(text);
 const lower=text.toLocaleLowerCase();
 let result='',start=0,found=lower.indexOf(searchWord);
 while(found!==-1){
  result+=esc(text.slice(start,found))+'<mark>'+esc(text.slice(found,found+searchWord.length))+'</mark>';
  start=found+searchWord.length;
  found=lower.indexOf(searchWord,start);
 }
 return result+esc(text.slice(start));
}
// AI 인사이트 첫 줄 "영향: 기회/위협/참고"를 읽어 영향 종류를 돌려줍니다. 없으면 빈 글자입니다.
function impactOf(a){
 const text=a.ai_summary||'';
 if(text.indexOf('영향:')===-1)return '';
 // "영향:"이 있는 그 한 줄만 봅니다. (다음 줄에 나오는 "기회" 같은 단어에 헷갈리지 않게)
 const line=text.slice(text.indexOf('영향:')).split('\n')[0];
 if(line.indexOf('위협')!==-1)return '위협';
 if(line.indexOf('기회')!==-1)return '기회';
 return '참고';
}
// 영향 필터: "both"는 기회와 위협을 함께 보여줍니다.
function matchesImpact(a,impact){
 if(!impact)return true;
 const kind=impactOf(a);
 if(impact==='both')return kind==='기회'||kind==='위협';
 return kind===impact;
}
// 기사 한 줄을 만듭니다. (신문 브리핑형)
// 한 줄에는 제목·매체·날짜·한 줄 미리보기만 보이고,
// "자세히"를 누르면 AI 인사이트, 기사 앞부분, 같은 소식, 메모, 숨기기가 펼쳐집니다.
function card(a,others){
 // 정책 추적 예시 (데이터가 있을 때만)
 let track='';
 if(a.track){track='<details class="policy"><summary>정책 추적 예시 · '+esc(a.track.name)+'</summary><dl><dt>이전 기록</dt><dd>'+esc(a.track.before)+'</dd><dt>이번 기사에서 확인할 내용</dt><dd>'+esc(a.track.change)+'</dd><dt>다음 확인 사항</dt><dd>'+esc(a.track.next)+'</dd></dl><p class="policy-note">공식 자료 검증 및 자동 이력 비교 전의 화면 예시입니다.</p></details>';}

 // AI 인사이트가 있으면 인사이트 상자를, 없으면 "AI 인사이트 만들기" 버튼을 보여줍니다.
 // 예전에 만든 요약을 새 인사이트로 바꾸고 싶을 때는 상자 안의 "다시 만들기"를 누릅니다.
 let aiBox='<button type="button" class="small-button" data-summary="'+a.id+'">✨ AI 인사이트 만들기</button>';
 if(a.ai_summary){aiBox='<div class="ai-summary"><strong>AI 인사이트</strong><p>'+highlight(a.ai_summary)+'</p><button type="button" class="text-button" data-summary="'+a.id+'">↻ 다시 만들기</button></div>';}

 const star='<button type="button" class="star'+(a.starred?' on':'')+'" data-star="'+a.id+'" aria-label="중요 기사 표시">'+(a.starred?'★':'☆')+'</button>';
 const newBadge=isNew(a)?'<span class="new-badge">NEW</span>':'';
 const memoBox='<div class="memo"><textarea maxlength="300" id="memo-'+a.id+'" placeholder="짧은 메모를 남겨 보세요">'+esc(a.memo||'')+'</textarea><button type="button" class="small-button" data-memo="'+a.id+'">메모 저장</button></div>';
 const hideButton='<button type="button" class="text-button" data-hide="'+a.id+'">'+(a.hidden?'다시 보이기':'이 기사 숨기기')+'</button>';

 // 같은 소식을 다룬 다른 매체 기사 목록입니다.
 let sameNews='',sameChip='';
 if(others&&others.length){
  sameChip='<span class="chip">외 '+others.length+'개 매체</span>';
  sameNews='<div class="same-news"><strong>같은 소식을 다룬 기사</strong><ul>'+others.map(function(o){return '<li><a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">'+esc(o.title)+'</a> <span class="muted">'+esc(o.source)+' · '+esc(o.date)+'</span></li>';}).join('')+'</ul></div>';
 }
 const memoChip=a.memo?'<span class="chip memo-chip" title="'+esc(a.memo)+'">📝 메모</span>':'';
 // 한 줄 목록의 배지: 기회는 초록, 위협은 빨강, 그 밖에 인사이트가 있으면 파란 "AI 인사이트"
 const impact=impactOf(a);
 let aiChip=a.ai_summary?'<span class="chip ai-chip">AI 인사이트</span>':'';
 if(impact==='기회')aiChip='<span class="chip impact-good">🟢 기회</span>';
 if(impact==='위협')aiChip='<span class="chip impact-bad">🔴 위협</span>';

 // 한 줄 미리보기: 부제목이 있으면 부제목, 없으면 기사 앞부분
 const preview=a.subtitle||a.summary||'';
 const tags='<div class="tags">'+a.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>';

 return '<article class="item'+(a.hidden?' hidden-item':'')+'">'+
  '<div class="item-body">'+
   '<div class="item-title">'+newBadge+'<a href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">'+highlight(a.title)+'</a></div>'+
   '<div class="item-meta"><span class="entity">'+highlight(a.entity)+'</span><span>'+esc(a.source)+'</span><span>'+esc(a.date.slice(5).replace('-','/'))+'</span>'+aiChip+sameChip+memoChip+'</div>'+
   (preview?'<p class="item-preview">'+highlight(preview)+'</p>':'')+
   '<details class="item-more"><summary>자세히</summary><div class="item-detail">'+
    aiBox+
    '<p class="detail-text">'+highlight((a.subtitle?a.subtitle+'\n\n':'')+a.summary)+'</p>'+
    tags+track+sameNews+memoBox+
    '<div class="detail-foot"><a class="source" href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>'+hideButton+'</div>'+
   '</div></details>'+
  '</div>'+star+
 '</article>';
}
// 페이지 나누기: 카테고리마다 한 페이지에 기사(같은 소식 묶음은 1개로 셈)를 최대 6개까지 보여줍니다.
const PAGE_SIZE=6;
const currentPages={}; // 카테고리별로 지금 보고 있는 페이지 번호 (1부터 시작)
function resetPages(){categories.forEach(function(c){currentPages[c.id]=1;});}
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
// 한국 시간 기준으로 오늘에서 days일 전 날짜(YYYY-MM-DD)를 만듭니다.
function kstDate(days){return new Date(Date.now()-days*86400000+9*3600000).toISOString().slice(0,10);}
// 기간 필터: 기사 날짜(YYYY-MM-DD)가 기준일 이후인지 확인합니다. (한국 시간 기준)
function matchesPeriod(a,period){
 if(!period)return true;
 const days=period==='today'?0:Number(period)-1;
 return a.date>=kstDate(days);
}
// 정렬: 메인 일치 기사는 항상 뒤로 보내고, 그 안에서 선택한 순서대로 정렬합니다.
function sortRows(rows,sort){
 return rows.sort(function(a,b){
  const main=Number(a.match_level==='main')-Number(b.match_level==='main');
  if(sort==='old')return main||a.date.localeCompare(b.date);
  if(sort==='star')return main||b.starred-a.starred||b.date.localeCompare(a.date);
  return main||b.date.localeCompare(a.date);
 });
}
// 같은 소식 묶기: 제목을 두 글자씩 잘라(예: "캐논메디칼" → 캐논, 논메, 메디 …) 겹치는 비율을 봅니다.
function titlePieces(title){
 const text=title.replace(/[^가-힣A-Za-z0-9]/g,'').toLowerCase();
 const pieces=new Set();
 for(let i=0;i<text.length-1;i++)pieces.add(text.slice(i,i+2));
 return pieces;
}
function similarity(a,b){
 let same=0;a.forEach(function(p){if(b.has(p))same++;});
 return same/(a.size+b.size-same||1);
}
function daysBetween(d1,d2){return Math.abs(new Date(d1)-new Date(d2))/86400000;}
const SAME_NEWS_LEVEL=0.45;  // 이 값보다 많이 겹치면 같은 소식으로 봅니다. (0~1, 높을수록 엄격)
// 묶음 안의 기사 "하나라도" 제목이 비슷하면 같은 묶음에 넣습니다.
// (예전에는 묶음의 첫 기사하고만 비교해서, 제목이 조금 다른 매체 기사가 따로 나오곤 했습니다)
function groupSameNews(rows){
 const groups=[];
 rows.forEach(function(a){
  const pieces=titlePieces(a.title);
  const found=groups.find(function(g){
   return g.members.some(function(m){return daysBetween(m.date,a.date)<=3&&similarity(m.pieces,pieces)>=SAME_NEWS_LEVEL;});
  });
  if(found){found.others.push(a);found.members.push({date:a.date,pieces:pieces});}
  else groups.push({main:a,others:[],members:[{date:a.date,pieces:pieces}]});
 });
 return groups;
}
// 통계: 지금 불러온 기사로 카테고리별 건수와 경쟁사별 언급 횟수를 막대로 보여줍니다.
function bars(title,counts){
 const names=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).slice(0,8);
 const max=names.length?counts[names[0]]:1;
 return '<div class="stat-box"><h3>'+title+'</h3>'+(names.length?names.map(function(n){return '<div class="bar-row"><span class="bar-name">'+esc(n)+'</span><span class="bar-track"><span class="bar-fill" style="width:'+Math.round(counts[n]/max*100)+'%"></span></span><span class="bar-num">'+counts[n]+'</span></div>';}).join(''):'<p class="muted">기사가 없습니다.</p>')+'</div>';
}
// 일별 추이: 최근 14일 날짜별 기사 수를 세로 막대로 보여줍니다.
function dailyChart(list){
 const days=[];
 for(let i=13;i>=0;i--)days.push(kstDate(i));
 const counts={};
 list.forEach(function(a){counts[a.date]=(counts[a.date]||0)+1;});
 const max=Math.max.apply(null,days.map(function(d){return counts[d]||0;}).concat([1]));
 return '<div class="stat-box wide"><h3>최근 14일 날짜별 기사 수</h3><div class="day-chart">'+days.map(function(d){const n=counts[d]||0;return '<div class="day-col" title="'+d+' · '+n+'건"><span class="day-num">'+n+'</span><span class="day-bar" style="height:'+Math.round(n/max*100)+'%"></span><span class="day-label">'+d.slice(5).replace('-','/')+'</span></div>';}).join('')+'</div></div>';
}
function renderStats(list){
 const byCategory={},byEntity={};
 list.forEach(function(a){
  const name=(categories.find(function(c){return c.id===a.category;})||{name:a.category}).name;
  byCategory[name]=(byCategory[name]||0)+1;
  if(a.category==='competitor')byEntity[a.entity]=(byEntity[a.entity]||0)+1;
 });
 document.getElementById('stats').innerHTML='<div class="section-head"><h2>간단 통계</h2><span class="count">현재 필터 기준 '+list.length+'건</span></div><div class="stat-grid">'+bars('카테고리별 기사 수',byCategory)+bars('경쟁사별 언급 횟수',byEntity)+dailyChart(list)+'</div>';
}
function render(){
 const q=document.getElementById('search').value.trim().toLocaleLowerCase();
 const topic=document.getElementById('topic').value;
 const includeMain=document.getElementById('include-main').checked;
 const period=document.getElementById('period').value;
 const impact=document.getElementById('impact').value;
 const sort=document.getElementById('sort').value;
 const onlyStar=document.getElementById('only-star').checked;
 const showHidden=document.getElementById('show-hidden').checked;
 const onlyNew=document.getElementById('only-new').checked;
 searchWord=q;
 const matches=articles.filter(function(a){
  const text=[a.title,a.entity,a.source,a.summary,a.ai_summary].concat(a.tags).join(' ').toLocaleLowerCase();
  return (a.match_level!=='main'||includeMain)&&(!q||text.includes(q))&&matchesTopic(a,topic)&&matchesPeriod(a,period)&&matchesImpact(a,impact)&&(!onlyStar||a.starred)&&(!a.hidden||showHidden)&&(!onlyNew||isNew(a));
 });
 renderStats(matches);
 renderBriefing(matches);
 document.getElementById('sections').innerHTML=categories.map(function(c){
  const rows=sortRows(matches.filter(function(a){return a.category===c.id;}),sort);
  const groups=groupSameNews(rows);
  // 전체 페이지 수를 구하고, 지금 페이지가 범위를 넘으면(기사를 숨겨서 줄어든 경우 등) 마지막 페이지로 맞춥니다.
  const pageCount=Math.max(1,Math.ceil(groups.length/PAGE_SIZE));
  let page=currentPages[c.id]||1;
  if(page>pageCount)page=pageCount;
  currentPages[c.id]=page;
  const shown=groups.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const more=pageCount>1?pageButtons(c,page,pageCount):'';
  const sameNote=rows.length>groups.length?'같은 소식 묶음 포함 기사 '+rows.length+'건':'';
  const list=shown.length?shown.map(function(g){return card(g.main,g.others);}).join(''):'<p class="empty">조건에 맞는 기사가 없습니다.</p>';
  return '<section class="news-section cat-'+c.id+'" id="'+c.id+'">'+
   '<div class="news-head"><h2><span class="dot"></span>'+c.name+'<span class="head-count">'+groups.length+'</span></h2><span class="count">'+sameNote+'</span></div>'+
   '<div class="news-list">'+list+'</div>'+more+
  '</section>';
 }).join('');
}

// 카테고리 아래의 페이지 버튼 줄을 만듭니다. 예: [◀ 이전] [1] [2] [3] [다음 ▶]
function pageButtons(c,page,pageCount){
 function one(number,label,disabled,current){
  return '<button type="button" class="page-button'+(current?' on':'')+'" data-category="'+c.id+'" data-page="'+number+'"'+(disabled?' disabled':'')+(current?' aria-current="page"':'')+'>'+label+'</button>';
 }
 let html=one(page-1,'◀ 이전',page===1,false);
 for(let n=1;n<=pageCount;n++)html+=one(n,String(n),false,n===page);
 html+=one(page+1,'다음 ▶',page===pageCount,false);
 return '<nav class="pager" aria-label="'+esc(c.name)+' 페이지">'+html+'</nav>';
}

// 맨 위 브리핑 영역: 오늘 날짜와 카테고리별 건수(누르면 그 구역으로 이동)를 보여줍니다.
function renderBriefing(list){
 const today=kstDate(0);
 const todayCount=list.filter(function(a){return a.date===today;}).length;
 document.getElementById('today-date').textContent=new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'});
 const chips=categories.map(function(c){
  const n=list.filter(function(a){return a.category===c.id;}).length;
  return '<a class="summary-chip cat-'+c.id+'" href="#'+c.id+'"><span class="dot"></span>'+c.name+' <b>'+n+'</b></a>';
 }).join('');
 document.getElementById('summary-bar').innerHTML='<span class="summary-chip today-chip">오늘 <b>'+todayCount+'</b>건</span>'+chips;
}
function changeFilters(){resetPages();render();}
document.getElementById('search').addEventListener('input',changeFilters);
document.getElementById('topic').addEventListener('change',changeFilters);
document.getElementById('include-main').addEventListener('change',changeFilters);
['period','impact','sort','only-star','show-hidden','only-new'].forEach(function(id){document.getElementById(id).addEventListener('change',changeFilters);});
// 서버에 저장 요청을 보냅니다. 실패하면 한국어 메시지를 띄웁니다.
async function postJson(path,data){
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 if(!r.ok){let m='저장하지 못했습니다.';try{m=(await r.json()).error||m;}catch(e){}throw new Error(m);}
 return r.json();
}
async function saveStar(id,starred){
 try{await postJson('/api/article-star',{id:id,starred:starred});articles.forEach(function(a){if(a.id===id)a.starred=starred?1:0;});render();}
 catch(e){alert(e.message);}
}
async function saveMemo(id){
 const memo=document.getElementById('memo-'+id).value.trim();
 try{await postJson('/api/article-memo',{id:id,memo:memo});articles.forEach(function(a){if(a.id===id)a.memo=memo;});render();}
 catch(e){alert(e.message);}
}
async function saveHidden(id,hidden){
 try{await postJson('/api/article-hide',{id:id,hidden:hidden});articles.forEach(function(a){if(a.id===id)a.hidden=hidden;});render();}
 catch(e){alert(e.message);}
}
// AI 인사이트 만들기: 서버가 GPT에 다시 요청하고, 성공하면 카드에 인사이트를 넣습니다.
async function remakeSummary(button,id){
 button.disabled=true;button.textContent='AI 인사이트 만드는 중…';
 try{const d=await postJson('/api/article-summary',{id:id});articles.forEach(function(a){if(a.id===id)a.ai_summary=d.ai_summary;});render();}
 catch(e){alert(e.message);button.disabled=false;button.textContent='AI 인사이트 만들기';}
}
document.getElementById('sections').addEventListener('click',function(event){
 const starButton=event.target.closest('button[data-star]');
 if(starButton){const id=Number(starButton.getAttribute('data-star'));const now=articles.find(function(a){return a.id===id;});saveStar(id,!(now&&now.starred));return;}
 const memoButton=event.target.closest('button[data-memo]');
 if(memoButton){saveMemo(Number(memoButton.getAttribute('data-memo')));return;}
 const summaryButton=event.target.closest('button[data-summary]');
 if(summaryButton){remakeSummary(summaryButton,Number(summaryButton.getAttribute('data-summary')));return;}
 const hideBtn=event.target.closest('button[data-hide]');
 if(hideBtn){const id=Number(hideBtn.getAttribute('data-hide'));const now=articles.find(function(a){return a.id===id;});saveHidden(id,!(now&&now.hidden));return;}
 // 페이지 버튼: 누른 카테고리의 페이지 번호를 바꾸고, 그 카테고리 맨 위로 화면을 옮깁니다.
 const button=event.target.closest('button[data-page]');if(!button)return;
 const category=button.getAttribute('data-category');if(!categories.some(function(c){return c.id===category;}))return;
 currentPages[category]=Number(button.getAttribute('data-page'));render();
 document.getElementById(category).scrollIntoView({block:'start'});
});
// 맨 위 제목줄의 높이를 재서 CSS에 알려 줍니다. 카테고리 줄이 그 바로 아래에 붙도록 하기 위해서입니다.
// (화면 폭이 좁으면 제목줄이 두 줄이 되어 높이가 바뀌므로, 창 크기가 바뀔 때마다 다시 잽니다)
function measureHeader(){
 const height=document.querySelector('.topbar').offsetHeight;
 document.documentElement.style.setProperty('--header-height',height+'px');
}
measureHeader();
window.addEventListener('resize',measureHeader);
// 탭 메뉴: 위쪽 탭 버튼을 누르면 그 화면만 보이고 나머지 화면은 숨깁니다.
function showTab(name){
 // 없는 탭 이름이면 뉴스 탭을 보여줍니다.
 if(!document.querySelector('[data-panel="'+name+'"]'))name='news';
 document.querySelectorAll('[data-panel]').forEach(function(panel){panel.hidden=panel.getAttribute('data-panel')!==name;});
 document.querySelectorAll('.tab').forEach(function(button){
  const on=button.getAttribute('data-tab')===name;
  button.classList.toggle('on',on);
  button.setAttribute('aria-selected',on?'true':'false');
 });
 // 마지막으로 본 탭을 기억해 두었다가, 다음에 열 때 그 탭을 먼저 보여줍니다.
 try{localStorage.setItem('lastTab',name);}catch(e){}
}
document.querySelectorAll('.tab').forEach(function(button){
 button.addEventListener('click',function(){showTab(button.getAttribute('data-tab'));window.scrollTo(0,0);});
});
let lastTab='news';
try{lastTab=localStorage.getItem('lastTab')||'news';}catch(e){}
showTab(lastTab);
// 이번에 본 가장 최근 저장 시각을 기억해 두고, 새 기사 수를 안내합니다.
function rememberLastSeen(){
 const newest=articles.reduce(function(max,a){return a.saved_at>max?a.saved_at:max;},'');
 const count=articles.filter(function(a){return isNew(a)&&!a.hidden;}).length;
 document.getElementById('new-note').textContent=lastSeen===''?'':(count?'지난 방문 이후 새 기사 '+count+'건':'지난 방문 이후 새 기사가 없습니다.');
 try{if(newest)localStorage.setItem('lastSeenSavedAt',newest);}catch(e){}
}
async function refreshArticles(){const r=await fetch('/api/articles');if(!r.ok)throw new Error('Article loading failed');articles=(await r.json()).articles;rememberLastSeen();changeFilters();}
refreshArticles().catch(function(e){document.getElementById('sections').textContent=e.message;});
