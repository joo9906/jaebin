// SMD News Monitor — 2026-10-22 예약 수집 연결
// Cloudflare Worker 편집기의 기존 코드를 전체 교체하세요.
// 기존 Cloudflare Access 및 DB 연결을 유지하세요. AI API는 사용하지 않습니다.
const PAGE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMD 뉴스 클리핑</title>
<style>
:root{--red:#b31c32;--ink:#182538;--muted:#657285;--line:#e0e5ec;--bg:#f5f7fa}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--bg);font-family:Arial,"Malgun Gothic",sans-serif;line-height:1.65}button,input,select{font:inherit}a{color:inherit}header{background:white;border-bottom:1px solid var(--line)}.top{max-width:1180px;margin:auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{font-size:22px;font-weight:800;letter-spacing:-.6px}.brand span{color:var(--red)}.sub{font-size:12px;color:var(--muted);letter-spacing:1px}.pill{font-size:12px;background:#f3f5f8;border:1px solid var(--line);border-radius:30px;padding:5px 12px;white-space:nowrap}main{max-width:1180px;margin:auto;padding:30px 28px 60px}.intro{display:flex;justify-content:space-between;gap:24px;align-items:start}.intro h1{font-size:31px;letter-spacing:-1.4px;line-height:1.3;margin:10px 0}.intro p{margin:0;color:var(--muted)}.eyebrow{font-size:12px;color:var(--red);font-weight:700;letter-spacing:1.5px}.notice{margin:24px 0;background:#fff8ec;border:1px solid #ecdabc;padding:14px 18px;border-radius:10px;font-size:13px;color:#795426}.controls{background:white;border:1px solid var(--line);border-radius:12px;padding:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}.controls input{min-width:180px;flex:1;border:1px solid #cfd7e3;border-radius:7px;padding:11px}.controls select{border:1px solid #cfd7e3;border-radius:7px;padding:11px;background:white}.reset{border:0;background:#edf1f6;border-radius:7px;padding:11px 15px;cursor:pointer}.nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 25px}.nav a{background:white;border:1px solid var(--line);text-decoration:none;padding:8px 15px;border-radius:7px;font-size:14px}.nav a:hover{border-color:var(--red);color:var(--red)}.section{scroll-margin-top:20px;margin:32px 0}.section-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:16px}.section-head h2{font-size:21px;letter-spacing:-.5px;margin:0}.section-head h2 span{font-size:12px;color:var(--red);margin-right:12px}.count{font-size:13px;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{background:white;border:1px solid var(--line);border-radius:10px;padding:22px;display:flex;flex-direction:column;gap:12px}.meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--muted);font-size:12px}.entity{font-weight:700;color:var(--red)}h3{font-size:18px;line-height:1.55;letter-spacing:-.5px;margin:0}.summary{font-size:14px;margin:0;color:#425064}.tags{display:flex;gap:6px;flex-wrap:wrap}.tag{font-size:11px;border-radius:4px;padding:2px 7px;background:#f0f3f7;color:#566579}.source{font-size:13px;font-weight:700;text-decoration:none;align-self:start;margin-top:auto}.source:hover{text-decoration:underline}.empty{grid-column:1/-1;border:1px dashed #cbd3df;border-radius:10px;padding:26px;background:#fafbfd;color:var(--muted);font-size:14px}.policy{background:#f6f8fc;border-radius:8px;padding:12px;font-size:13px}.policy summary{cursor:pointer;font-weight:700}.policy dl{margin:12px 0 0}.policy dt{font-weight:700;margin-top:10px}.policy dd{margin:2px 0;color:#526174}.policy-note{font-size:11px;color:var(--muted);margin:10px 0 0}.results{font-size:13px;color:var(--muted);margin:12px 2px}footer{padding-top:20px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #dc8290;outline-offset:3px}@media(max-width:700px){.top,main{padding-left:18px;padding-right:18px}.grid{grid-template-columns:1fr}.intro h1{font-size:26px}.controls select{width:100%}.top{align-items:start}.brand{font-size:19px}}
.more-wrap{text-align:center;margin:12px 0 0}.more-button{border:0;background:transparent;color:var(--muted);font-size:13px;padding:6px 14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.more-button:hover{color:var(--red)}.header-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px}.main-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer}.main-toggle input{position:absolute;opacity:0;width:1px;height:1px}.switch-track{width:26px;height:15px;background:#a7b1bf;border-radius:12px;position:relative;flex:none}.switch-track:after{content:'';position:absolute;left:2px;top:2px;width:11px;height:11px;border-radius:50%;background:white;transition:transform .15s}.main-toggle input:checked+.switch-track{background:var(--red)}.main-toggle input:checked+.switch-track:after{transform:translateX(11px)}.main-toggle:has(input:focus-visible){outline:3px solid #dc8290;outline-offset:3px}.back-top{position:fixed;right:22px;bottom:22px;z-index:10;background:white;border:1px solid var(--line);border-radius:24px;padding:9px 15px;font-size:13px;text-decoration:none;box-shadow:0 2px 10px #18253815}.back-top:hover{color:var(--red);border-color:var(--red)}.intro{margin-bottom:24px}@media(max-width:700px){.top{flex-wrap:wrap}.header-actions{margin-left:auto}.back-top{right:14px;bottom:14px}}</style></head><body id="top">
<header><div class="top"><div><div class="brand">Strategic Marketing Division</div><div class="sub">CANON MEDICAL SYSTEMS KOREA</div></div><div class="header-actions"><label class="pill main-toggle"><span>메인 일치 기사</span><input type="checkbox" id="include-main" role="switch" aria-label="메인 일치 기사 포함"><span class="switch-track" aria-hidden="true"></span></label><span class="pill">시범 운영</span></div></div></header>
<main><div class="intro"><div><div class="eyebrow">MARKET & POLICY INTELLIGENCE</div><h1>SMD 뉴스 클리핑</h1><p>우리회사 소식부터 관련 정책 변화, 경쟁사 동향까지 한 곳에서</p></div></div>
<div class="controls"><input id="search" type="search" aria-label="뉴스 검색" placeholder="기사 제목, 회사·기관, 키워드 검색"><select id="topic" aria-label="분야 필터"><option value="">모든 분야</option><option>AI</option><option>CT</option><option>MR</option><option>초음파</option><option>학회</option></select></div>
<nav class="nav" aria-label="카테고리 바로가기"><a href="#company">01 우리회사 뉴스</a><a href="#policy">02 정책</a><a href="#hospital">03 학회&병원</a><a href="#competitor">04 경쟁사</a></nav>
<div id="sections"></div>
<footer>Strategic Marketing Division · 사내 시범 사이트</footer></main><a class="back-top" href="#top" aria-label="맨 위로 돌아가기">↑ 맨 위로</a>
<script>
const categories=[{id:'company',name:'우리회사 뉴스'},{id:'policy',name:'정책'},{id:'hospital',name:'학회&병원'},{id:'competitor',name:'경쟁사'}];
const articles=[
{category:'policy',entity:'의료기기 설치 기준',date:'2026-09-29',source:'데일리메디',title:"CT·MRI ‘병상공동활용제 폐지’ 논란 재점화",summary:'기존 클리핑은 특수의료장비 설치 관련 병상공동활용제 폐지 재추진과 의료계의 우려를 소개합니다. 개정안 발의와 시행 확정은 구분해서 확인해야 합니다.',tags:['CT','MRI','장비 설치'],url:'https://www.dailymedi.com/news/news_view.php?wr_id=940875',track:{name:'병상공동활용제',before:'이전 정책 기록 미등록',change:'기사에서 폐지 재추진 및 개정안 관련 논의를 소개함',next:'개정안 원문, 심사 진행, 공포·시행 여부 확인 필요'}},
{category:'policy',entity:'비급여 진료비',date:'2026-09-27',source:'데일리메디',title:'초음파·MRI 등 비급여 진료비, 지역·병원 천차만별',summary:'기존 클리핑은 비급여 진료비의 연도별 변화와 지역·병원별 차이를 소개합니다. 가격 통계 발표이며, 그 자체가 수가 제도 변경을 뜻하지는 않습니다.',tags:['MRI','초음파','비급여'],url:'https://www.dailymedi.com/news/news_view.php?wr_id=940860'},
{category:'policy',entity:'폐암 검진',date:'2026-09-29',source:'국민일보',title:'폐암 국가검진, 병·의원 확대 목소리',summary:'기존 클리핑은 폐암 검진기관 지정 기회를 병·의원으로 확대해야 한다는 의견을 소개합니다. 확대 요구와 실제 기준 변경은 별도로 확인해야 합니다.',tags:['CT','검진','폐암'],url:'https://www.kmib.co.kr/article/view.asp?arcid=9000018008&cp=nv',track:{name:'폐암 검진기관 지정 기준',before:'기존 클리핑은 신청 자격이 종합병원으로 한정된다고 설명',change:'병·의원 확대 필요성에 대한 의견이 소개됨. 기준 변경 여부는 미확인',next:'공식 시행규칙과 후속 발표 확인 필요'}},
{category:'hospital',entity:'서울아산병원',date:'2026-09-28',source:'뉴시스',title:'국내 최초 태아심장센터, 서울아산병원에 개소',summary:'기존 태아치료센터에서 태아 심장질환 진료를 분리한 전문 센터 소식입니다. 산전 상담부터 출생 후 처치·수술까지 이어지는 진료 체계를 소개합니다.',tags:['병원','센터 신설'],url:'https://www.newsis.com/view/NISX20260928_0003804901'},
{category:'hospital',entity:'국내 주요 병원',date:'2026-09-28',source:'의학신문',title:'국내 4대병원, 8대 전문분야 세계 10위권',summary:'기존 클리핑은 뉴스위크 전문 병원 평가에서 국내 주요 병원의 여러 진료 분야가 높은 순위를 기록한 소식을 소개합니다.',tags:['병원','평가'],url:'https://www.bosa.co.kr/news/articleView.html?idxno=3012669'},
{category:'competitor',entity:'지멘스 헬시니어스',date:'2026-09-23',source:'의학신문',title:'치매·대사질환부터 AI 인프라까지 초정밀 진단 생태계 확장',summary:'기존 클리핑은 치매 진단 고도화, 바이오마커 연구 협력, 지역 병원의 AI 영상 장비 보급 등 지멘스의 사업 활동을 소개합니다.',tags:['AI','영상진단'],url:'https://www.bosa.co.kr/news/articleView.html?idxno=3012736'},
{category:'competitor',entity:'GE 헬스케어',date:'2026-09-27',source:'메디게이트뉴스',title:'동탄시티병원, AI MRI 도입과 운영 성과 소개',summary:'기존 클리핑은 GE의 AI 기술을 탑재한 MRI 도입 후 검사시간 단축과 투자비 회수에 관한 병원 측 사례를 소개합니다. 개별 사례를 다른 병원의 예상 성과로 일반화하지 않습니다.',tags:['MRI','AI','병원 도입'],url:'https://www.medigatenews.com/news/836440281'},
{category:'competitor',entity:'필립스 헬스케어',date:'2026-09-23',source:'데일리메디',title:'필립스 MRI 관련 품질 문제와 회수 소식',summary:'기존 클리핑은 필립스 MRI 관련 회수 소식을 소개합니다. 대상 제품과 조치 범위는 원문 및 공식 회수 공고에서 확인해야 합니다.',tags:['MRI','회수'],url:'https://www.dailymedi.com/news/news_view.php?wr_id=940807'},
{category:'competitor',entity:'삼성메디슨',date:'2026-09-23',source:'더구루',title:'카자흐스탄 초음파 진단기기 현지 생산 추진',summary:'기존 클리핑은 삼성전자의 현지 제조 역량을 활용한 삼성메디슨의 초음파 진단기기 생산 추진과 중앙아시아 시장 확대 전략을 소개합니다.',tags:['초음파','해외 사업'],url:'https://www.theguru.co.kr/news/article.html?no=107495'}
];
function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function card(a){let track='';if(a.track){track='<details class="policy"><summary>정책 추적 예시 · '+esc(a.track.name)+'</summary><dl><dt>이전 기록</dt><dd>'+esc(a.track.before)+'</dd><dt>이번 기사에서 확인할 내용</dt><dd>'+esc(a.track.change)+'</dd><dt>다음 확인 사항</dt><dd>'+esc(a.track.next)+'</dd></dl><p class="policy-note">공식 자료 검증 및 자동 이력 비교 전의 화면 예시입니다.</p></details>';}
return '<article class="card"><div class="meta"><span class="entity">'+esc(a.entity)+'</span><span>'+esc(a.source)+' · '+esc(a.date)+'</span></div><h3>'+esc(a.title)+'</h3><p class="summary">'+esc(a.summary)+'</p><div class="tags">'+a.tags.map(function(t){return '<span class="tag">'+esc(t)+'</span>';}).join('')+'</div>'+track+'<a class="source" href="'+esc(a.url)+'" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></article>';}
const PAGE_SIZE=6;
const visibleCounts={};
function resetVisibleCounts(){categories.forEach(function(c){visibleCounts[c.id]=PAGE_SIZE;});}
function matchesTopic(a,topic){
 if(!topic)return true;
 const text=[a.title].concat(a.tags||[]).join(' ');
 if(topic==='AI')return /(?:\\bAI\\b|인공지능)/i.test(text);
 if(topic==='CT')return /(?:\\bCT\\b|CT(?=[가-힣])|컴퓨터단층|전산화단층)/i.test(text);
 if(topic==='MR')return /(?:\\bMRI?\\b|MRI?(?=[가-힣])|자기공명)/i.test(text);
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
changeFilters();
</script></body></html>`;

// 전체 파일을 Cloudflare Worker 코드 편집기에 붙여 넣으세요.
// 기준: SMD_news_config_20261022.xlsx + 확정한 변경사항
const CONFIG_VERSION = "2026-10-22-r2";
const CATEGORY_CONFIG = [{"id":"company","name":"우리회사 뉴스"},{"id":"policy","name":"정책"},{"id":"hospital","name":"학회&병원"},{"id":"competitor","name":"경쟁사"}];
const SOURCE_CONFIG = [{"id":"S012","name":"청년의사","label":"청년의사","status":"사용","categories":["company","policy","hospital","competitor"],"url":"https://www.docdocdoc.co.kr/","listingUrl":"https://www.docdocdoc.co.kr/news/articleList.html?view_type=sm","kind":"bosa"},{"id":"S018","name":"후생신보","label":"후생신보","status":"사용","categories":["company","policy","hospital","competitor"],"url":"https://www.whosaeng.com/","listingUrl":"https://www.whosaeng.com/sub_view.html?type=abs","kind":"whosaeng"},{"id":"S002","name":"메디게이트뉴스","label":"메디게이트뉴스","status":"사용","categories":["company","policy","hospital","competitor"],"url":"https://www.medigatenews.com/","listingUrl":"https://www.medigatenews.com/section/all","kind":"gate"},{"id":"S015","name":"병원신문","label":"병원신문 · 병원","status":"사용","categories":["hospital"],"url":"https://www.khanews.com/","listingUrl":"https://www.khanews.com/news/articleList.html?sc_sub_section_code=S2N8&view_type=sm","kind":"bosa"},{"id":"S004","name":"메디칼타임즈","label":"메디칼타임즈","status":"사용","categories":["company","policy","hospital","competitor"],"url":"https://www.medicaltimes.com/","listingUrl":"https://www.medicaltimes.com/Main/News/List.html?MainCate=4","kind":"medicaltimes"},{"id":"S007","name":"의협신문","label":"의협신문","status":"사용","categories":["hospital"],"url":"https://www.doctorsnews.co.kr/","listingUrl":"https://www.doctorsnews.co.kr/news/articleList.html?sc_section_code=S1N10&view_type=sm","kind":"bosa"},{"id":"S011","name":"건강보험심사평가원","label":"건강보험심사평가원","status":"사용","categories":["policy"],"url":"https://www.hira.or.kr/","listingUrl":"https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA020041000100","kind":"hira"},{"id":"S021","name":"국민건강보험공단","label":"국민건강보험공단","status":"사용","categories":["policy"],"url":"https://www.nhis.or.kr/","listingUrl":"https://www.nhis.or.kr/nhis/together/wbhaea01600m01.do","kind":"nhis"},{"id":"S025","name":"세브란스병원 보도자료","label":"세브란스병원 보도자료","status":"사용","categories":["hospital"],"url":"https://sev.severance.healthcare/","listingUrl":"https://sev.severance.healthcare/sev/news/press/report.do","kind":"sev"},{"id":"S024","name":"서울대학교병원 보도자료","label":"서울대학교병원 보도자료","status":"사용","categories":["hospital"],"url":"https://www.snuh.org/","listingUrl":"https://www.snuh.org/about/news/press/list.do","kind":"snuh"},{"id":"S023","name":"서울아산병원 보도자료","label":"서울아산병원 보도자료","status":"사용","categories":["hospital"],"url":"https://news.amc.seoul.kr/","listingUrl":"https://news.amc.seoul.kr/news/con/list.do?pressChk=Y","kind":"amc"},{"id":"S027","name":"전자신문","url":"https://www.etnews.com/","kind":"etnews","status":"사용","label":"전자신문 · AI·SW","listingUrl":"https://www.etnews.com/news/section.html?id1=04","categories":["company","policy","hospital","competitor"]},{"id":"S001","name":"의학신문","label":"의학신문","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.bosa.co.kr/","listingUrl":"https://www.bosa.co.kr/news/articleList.html?view_type=sm","kind":"bosa"},{"id":"S003","name":"데일리메디","label":"데일리메디","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.dailymedi.com/","listingUrl":"https://www.dailymedi.com/news/news_list.php?ca_id=22","kind":"daily"},{"id":"S005","name":"라포르시안","label":"라포르시안","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.rapportian.com/","listingUrl":"https://www.rapportian.com/news/articleList.html?view_type=sm","kind":"bosa"},{"id":"S006","name":"의사신문","label":"의사신문","status":"중지","categories":["company","policy","hospital","competitor"],"url":"http://www.doctorstimes.com/","listingUrl":"http://www.doctorstimes.com/news/articleList.html?sc_section_code=S1N1&view_type=sm","kind":"bosa"},{"id":"S008","name":"데일리팜","label":"데일리팜","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.dailypharm.com/","listingUrl":"https://www.dailypharm.com/user/news","kind":"dailypharm"},{"id":"S009","name":"보건복지부","label":"보건복지부","status":"중지","categories":["policy"],"url":"https://www.mohw.go.kr/","listingUrl":"https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027","kind":"mohw"},{"id":"S010","name":"식품의약품안전처","label":"식품의약품안전처","status":"중지","categories":["policy"],"url":"https://www.mfds.go.kr/","listingUrl":"https://www.mfds.go.kr/brd/m_99/list.do","kind":"mfds"},{"id":"S013","name":"메디파나뉴스","label":"메디파나뉴스","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.medipana.com/","listingUrl":"https://www.medipana.com/news/articleList.html?view_type=sm","kind":"medipana"},{"id":"S014","name":"병원신문","label":"병원신문 · 학회","status":"중지","categories":["hospital"],"url":"https://www.khanews.com/","listingUrl":"https://www.khanews.com/news/articleList.html?sc_sub_section_code=S2N5&view_type=sm","kind":"bosa"},{"id":"S016","name":"병원신문","label":"병원신문 · 인사, 취임","status":"중지","categories":["hospital"],"url":"https://www.khanews.com/","listingUrl":"https://www.khanews.com/news/articleList.html?sc_sub_section_code=S2N88&view_type=sm","kind":"bosa"},{"id":"S017","name":"메디컬업저버","label":"메디컬업저버","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.monews.co.kr/","listingUrl":"https://www.monews.co.kr/news/articleList.html?view_type=sm","kind":"bosa"},{"id":"S019","name":"약업신문","label":"약업신문","status":"중지","categories":["company","policy","hospital","competitor"],"url":"https://www.yakup.com/","listingUrl":"https://www.yakup.com/news/index.html?cat=12&cat2=124","kind":"yakup"},{"id":"S020","name":"연합뉴스","label":"연합뉴스","status":"중지","categories":["policy","hospital","competitor"],"url":"https://www.yna.co.kr/","listingUrl":"https://www.yna.co.kr/health/all","kind":"yna"},{"id":"S022","name":"대한병원협회","label":"대한병원협회","status":"중지","categories":["policy","hospital"],"url":"https://www.kha.or.kr/","listingUrl":"https://www.kha.or.kr/kha_home/press-release.do","kind":"kha"},{"id":"S026","name":"서울성모병원 보도자료","label":"서울성모병원 보도자료","status":"중지","categories":["hospital"],"url":"https://www.cmcseoul.or.kr/","listingUrl":"https://www.cmcseoul.or.kr/page/board/news","kind":"cmc"}];
const RULE_CONFIG = [{"id":"K001","status":"사용","category":"company","main":["캐논메디칼","캐논 메디칼","Canon Medical","캐논메디칼시스템즈"],"auxiliary":["의료영상","CT","MRI","초음파","영상진단","혈관조영","AI","심포지엄","행사","협력","병원","설치","공개","가동","연구","업무협약"],"excluded":["카메라","프린터","복합기","렌즈"]},{"id":"K003","status":"사용","category":"policy","main":["급여","비급여","수가","복지부","정부","식약처","식품의약품안전처","심평원","건강보험심사평가원","의료정책","전문의","전공의","국립대","빅5","필수의료","Big 5","경영","병상공동활용","특수의료장비","공동활용병상","영상의료장비","영상진단장비"],"auxiliary":["CT","MRI","초음파","Angio","혈관조영","영상진단","영상","AI","발표","투자"],"excluded":["개인 보험 광고"]},{"id":"K012","status":"사용","category":"policy","main":["의료기기법","디지털의료제품법","신의료기술평가","의료기기 허가","의료기기 인증","혁신의료기술","의료 AI","의료영상 AI"],"auxiliary":["영상진단","의료영상","CT","MRI","초음파","혈관조영","수가","급여","건강보험","진단","인증","시행","도입","AI"],"excluded":[]},{"id":"K004","status":"사용","category":"hospital","main":["영상의학회","영상의학","초음파의학회","초음파학회"],"auxiliary":["학술대회","학회","연구","임상","가이드라인","대회","심포지엄","행사","AI","임명","회장","차기회장","취임","선임","연임"],"excluded":["채용"]},{"id":"K005","status":"사용","category":"hospital","main":["서울아산병원","삼성서울병원","서울대학교병원","서울대병원","세브란스","성모병원","상급종합병원","대학병원","응급실","검진센터","의료원"],"auxiliary":["장비","MRI","CT","초음파","영상진단","혈관조영","Angio","AI","영상진단장비","경영","투자"],"excluded":["채용"]},{"id":"K006","status":"사용","category":"competitor","main":["지멘스 헬시니어스","Siemens Healthineers","지멘스"],"auxiliary":["의료영상","CT","MRI","초음파","영상진단","혈관조영","AI","심포지엄","행사","협력","병원","설치","공개","가동","연구","업무협약"],"excluded":["산업자동화"]},{"id":"K007","status":"사용","category":"competitor","main":["GE 헬스케어","GE헬스케어","GE Healthcare","GE"],"auxiliary":["의료영상","CT","MRI","초음파","영상진단","혈관조영","AI","심포지엄","행사","협력","병원","설치","공개","가동","연구","업무협약"],"excluded":["항공","발전","GE버노바","항공엔진"]},{"id":"K008","status":"사용","category":"competitor","main":["필립스","Philips","필립스 헬스케어","Philips Healthcare"],"auxiliary":["의료영상","CT","MRI","초음파","영상진단","혈관조영","AI","심포지엄","행사","협력","병원","설치","공개","가동","연구","업무협약"],"excluded":["생활가전","전동칫솔","면도기"]},{"id":"K009","status":"사용","category":"competitor","main":["삼성메디슨","Samsung Medison"],"auxiliary":["의료영상","CT","MRI","초음파","영상진단","혈관조영","AI","심포지엄","행사","협력","병원","설치","공개","가동","연구","업무협약"],"excluded":["스마트폰"]}];
const NEWS_SOURCES = SOURCE_CONFIG.filter(s=>s.status==='사용'&&s.listingUrl);
function decodeText(value) {
  value=String(value||'').replace(/&(hellip|middot|ndash|mdash|lsquo|rsquo|ldquo|rdquo);/gi,(_,k)=>({hellip:'…',middot:'·',ndash:'–',mdash:'—',lsquo:"'",rsquo:"'",ldquo:'\"',rdquo:'\"'}[k.toLowerCase()]));
  return value.replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,v)=>{
    if(v[0]==='#') { const n=v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10); return n>0&&n<=0x10ffff?String.fromCodePoint(n):' '; }
    return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[v.toLowerCase()];
  }).replace(/\s+/g,' ').trim();
}
const WORD_PATTERNS = new Map();
function hasWord(text, word) {
  text=String(text||'');word=String(word||'').trim();if(!word)return false;
  if(/^[a-z0-9 ]+$/i.test(word)) {
    const safe=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(!WORD_PATTERNS.has(word))WORD_PATTERNS.set(word,new RegExp('(^|[^a-z0-9])'+safe+'(?=$|[^a-z0-9])','i'));
    return WORD_PATTERNS.get(word).test(text);
  }
  return text.toLowerCase().includes(word.toLowerCase());
}
// 화면 순서는 기존대로 유지하고, 중복 분류 우선순위만 별도로 적용합니다.
const CATEGORY_PRIORITY = {competitor:0,company:1,hospital:2,policy:3};
/** @typedef {{id:string,status:string,category:string,main:string[],auxiliary:string[],excluded:string[]}} NewsRule */
/** @typedef {NewsRule & {mainMatches:string[],auxiliaryMatches:string[],matchLevel:string}} RuleMatch */
/** @returns {RuleMatch[]} */
function keywordMatch(title,source){
  if(!source||source.status!=='사용')return [];
  const matches=[];
  for(const rule of RULE_CONFIG){
    if(rule.status!=='사용'||!source.categories.includes(rule.category))continue;
    const mainMatches=rule.main.filter(word=>hasWord(title,word));
    if(!mainMatches.length||rule.excluded.some(word=>hasWord(title,word)))continue;
    const auxiliaryMatches=rule.auxiliary.filter(word=>hasWord(title,word));
    matches.push({...rule,mainMatches,auxiliaryMatches,matchLevel:!rule.auxiliary.length||auxiliaryMatches.length?'full':'main'});
  }
  matches.sort((a,b)=>CATEGORY_PRIORITY[a.category]-CATEGORY_PRIORITY[b.category]||Number(b.matchLevel==='full')-Number(a.matchLevel==='full'));
  return matches.length?matches.filter(rule=>rule.category===matches[0].category):[];
}
function selectionLevel(groups){return groups.some(rule=>rule.matchLevel==='full')?'full':groups.length?'main':'none';}
function articleTags(groups){return [...new Set(groups.flatMap(rule=>[...rule.mainMatches,...rule.auxiliaryMatches]))].slice(0,12);}
function hostOf(value){try{return new URL(value).hostname.replace(/^www\./,'');}catch{return '';}}
function articleUrl(href,source,allowAlternate=false){
  let u;try{u=new URL(decodeText(href),source.listingUrl);}catch{return null;}
  if(!['http:','https:'].includes(u.protocol)||hostOf(u.href)!==hostOf(source.url))return null;
  const q=u.searchParams,p=u.pathname,k=source.kind;let keys=[];
  if(k==='bosa'){if(p!=='/news/articleView.html'||!/^\d+$/.test(q.get('idxno')||''))return null;keys=['idxno'];}
  else if(k==='gate'){if(!/^\/news\/\d+$/.test(p))return null;}
  else if(k==='medicaltimes'){if(p.toLowerCase()!=='/main/news/newsview.html'||!q.get('ID'))return null;keys=['ID'];}
  else if(k==='dailypharm'){if(!/^\/user\/news\/\d+$/.test(p))return null;}
  else if(k==='mohw'){if(p!=='/board.es'||q.get('act')!=='view'||!q.get('list_no'))return null;keys=['mid','bid','act','list_no'];}
  else if(k==='mfds'){if(!/\/brd\/m_\d+\/view.do$/.test(p)||!q.get('seq'))return null;keys=['seq'];}
  else if(k==='hira'){if(!/\/bbsDummy.do$/.test(p)||!q.get('brdBltNo'))return null;keys=['pgmid','brdScnBltNo','brdBltNo'];}
  else if(['nhis','kha','sev'].includes(k)){if(q.get('mode')!=='view'||!q.get('articleNo')||p!==new URL(source.listingUrl).pathname)return null;keys=['mode','articleNo'];}
  else if(k==='amc'){if(p!=='/news/con/detail.do'||!q.get('cntId'))return null;keys=['cntId','pressChk'];}
  else if(k==='snuh'){if(!p.endsWith('/view.do')||!q.get('bbs_no')||!(p.includes('/press/')||p==='/board/B003/view.do'))return null;if(p==='/board/B003/view.do'&&!allowAlternate&&new URL(source.listingUrl).pathname!=='/board/B003/list.do')return null;keys=['bbs_no','viewType'];}
  else if(k==='cmc'){if(!/^\/page\/board\/news\/\d+$/.test(p))return null;}
  else if(k==='etnews'){if(!/^\/20\d{12}$/.test(p))return null;}
  else if(k==='yna'){if(!/^\/view\/AKR\d+$/.test(p))return null;}
  else if(k==='yakup'){if(p!=='/news/index.html'||q.get('mode')!=='view'||!q.get('nid'))return null;keys=['mode','cat','cat2','nid'];}
  else if(k==='whosaeng'){if(!/^\/\d+$/.test(p)&&!(p.endsWith('/read.php')&&q.get('uid')))return null;keys=['uid'];}
  else if(k==='medipana'){if(p==='/news/articleView.html'&&q.get('idxno'))keys=['idxno'];else if(/articleView\.php$/.test(p)&&q.get('news_idx'))keys=['news_idx'];else if(/article\/view\.php$/.test(p)&&(q.get('news_idx')||q.get('idxno')))keys=['news_idx','idxno'];else return null;}
  else return null;
  const out=new URL(p,source.url);for(const key of keys)if(q.get(key))out.searchParams.set(key,q.get(key));
  out.searchParams.sort();return out.href;
}
function parseCandidates(html,source){
  const unique=new Map();
  if(source.kind==='etnews'){const list=htmlSection(html,'col_left','class');if(!list)throw new Error('전자신문 AI·SW 목록 영역을 찾지 못했습니다.');html=list;}
  // 식약처는 기사 목록 영역만 탐색해 메뉴·첨부파일 처리 비용을 줄입니다.
  if(source.kind==='mfds'){const start=html.indexOf('<!-- s:bbs_list01 -->'),end=html.indexOf('<!-- e:bbs_list01 -->',start);if(start>=0&&end>start)html=html.slice(start,end);}
  const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
  for(const a of clean.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
    let href=attributeValue(a[1],'href');if(!href)continue;
    if(source.kind==='snuh'&&/^javascript:viewPage/i.test(href)){const id=href.match(/viewPage\(['"](\d+)/i)?.[1];if(id)href='/board/B003/view.do?bbs_no='+id+'&viewType=true';}
    if(source.kind==='mfds'&&!/view\.do\?[^#]*\bseq=\d+/.test(href))continue;
    const url=articleUrl(href,source);if(!url)continue;
    if(source.kind==='mfds'&&unique.has(url))continue;
    const titleAttr=a[1].match(/\btitle\s*=\s*["']([^"']*)["']/i)?.[1];
    const heading=a[2].match(/<(h[1-6]|strong)\b[^>]*>([\s\S]*?)<\/\1>/i);
    const inner=a[2].replace(/<img\b[^>]*>/gi,'');
    let title=decodeText(heading?.[2]||inner);
    if((title.length<8||source.kind==='sev')&&titleAttr&&!/자세히보기|바로가기|다운로드/.test(titleAttr))title=decodeText(titleAttr.replace(/\s*자세히 보기$/,''));
    title=title.replace(/^새글\s*/,'').replace(/\s+New\s+\d{4}-\d{2}-\d{2}.*$/i,'').trim();
    if(title.length<8||title.length>220)continue;
    const groups=keywordMatch(title,source);
    const priority=selectionLevel(groups)==='full'?2:groups.length?1:0;
    const row={title,url,groups:groups.map(g=>g.id),category:groups[0]?.category||null,matchLevel:selectionLevel(groups),priority};
    const previous=unique.get(url);if(!previous||priority>previous.priority)unique.set(url,row);
  }
  return [...unique.values()].sort((a,b)=>b.priority-a.priority);
}
async function fetchHtml(url,source,max=750000,accept='text/html'){
  let target=new URL(url);
  const signal=AbortSignal.timeout(source.kind==='mfds'?30000:15000);
  for(let hop=0;hop<4;hop++){
    if(!['http:','https:'].includes(target.protocol)||hostOf(target.href)!==hostOf(source.url)||target.username||target.password||target.port)throw new Error('등록된 정보원 주소가 아닙니다.');
    const r=await fetch(target.href,{redirect:'manual',signal,headers:{'User-Agent':'SMDNewsMonitor/0.3','Accept':accept}});
    if([301,302,303,307,308].includes(r.status)){const next=r.headers.get('Location');await r.body?.cancel();if(!next)throw new Error('이동 주소 없음');target=new URL(next,target);continue;}
    if(!r.ok){await r.body?.cancel();throw new Error('정보원 HTTP '+r.status+' · 서버가 수집 요청을 받지 못했습니다.');}
    const ct=r.headers.get('Content-Type')||'';if(!(accept==='application/json'?/json/i.test(ct):/text\/html/i.test(ct)))throw new Error('응답 형식이 맞지 않습니다.');
    const reader=r.body.getReader(),chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error('페이지 크기 제한 초과');chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let charset=ct.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];
    if(!charset)charset=new TextDecoder('ascii').decode(bytes.slice(0,4096)).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'utf-8';
    const text=new TextDecoder(charset).decode(bytes);if(text.length<5000&&/Web Application Firewall page block|웹방화벽|접근이 차단되었습니다|비정상적인 접근으로 인해 차단/i.test(text))throw new Error('정보원 방화벽에서 접속을 제한했습니다.');return text;
  }
  throw new Error('이동 횟수 제한 초과');
}
async function fetchListing(source){
  try{return await fetchHtml(source.listingUrl,source);}
  catch(error){
    // 의학신문의 공개 HTTP 목록이 HTTPS 목록과 다르게 정상 응답하는 경우만 대체합니다.
    if(source.id==='S001'&&new URL(source.listingUrl).protocol==='https:'&&/HTTP 503|fetch failed|Network|network|timeout|timed out/i.test(String(error.message))){
      const alternate=new URL(source.listingUrl);alternate.protocol='http:';
      try{return await fetchHtml(alternate.href,source);}catch{throw new Error('의학신문 목록 연결 실패 · HTTPS와 HTTP 모두 응답하지 않습니다.');}
    }
    if(error.name==='TimeoutError'||error.name==='AbortError')throw new Error('정보원 응답 대기시간 초과 · '+(source.kind==='mfds'?'30':'15')+'초');
    throw error;
  }
}
async function readArticleHtml(url,source){if(!articleUrl(url,source,true))throw new Error('등록된 기사 주소가 아닙니다.');return fetchHtml(url,source);}
async function loadCandidates(source){
  let items=parseCandidates(await fetchListing(source),source);
  if(!items.length&&source.kind==='gate'){
    const endpoint=new URL('/section/date',source.url);endpoint.searchParams.set('date','');endpoint.searchParams.set('allOfDateFlag','Y');
    const data=JSON.parse(await fetchHtml(endpoint.href,source,400000,'application/json'));
    const anchors=(data.list||[]).flatMap(day=>day.newsList||[]).map(item=>{const id=String(item.news_id||'');if(!/^\d+$/.test(id))return '';const title=String(item.display_title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');return '<a href="/news/'+id+'">'+title+'</a>';}).join('');
    items=parseCandidates(anchors,source);
  }
  if(!items.length&&source.kind==='snuh'){const alternate={...source,listingUrl:new URL('/board/B003/list.do?viewType=true',source.url).href};items=parseCandidates(await fetchListing(alternate),alternate);}
  if(!items.length)throw new Error('기사 링크를 찾지 못했습니다. 동적 목록·접속 제한·주소 변경 여부를 확인해야 합니다.');
  return {items,lists:1,warning:''};
}

async function collectSource(db,source,scheduled=false){
  await db.prepare('DELETE FROM news_candidates WHERE expires_at<=CURRENT_TIMESTAMP').run();
  await db.prepare("DELETE FROM collection_runs WHERE started_at<=datetime('now','-7 days')").run();
  const run=scheduled
    ? await db.prepare("INSERT INTO collection_runs(source_id,source_name,run_status) VALUES(?,?,'running') RETURNING id").bind(source.id,source.name).first()
    : await db.prepare("INSERT INTO collection_runs(source_id,source_name,run_status) SELECT ?,?,'running' WHERE NOT EXISTS(SELECT 1 FROM collection_runs WHERE source_id=? AND source_name=? AND started_at>datetime('now','-10 minutes')) RETURNING id").bind(source.id,source.name,source.id,source.name).first();
  if(!run)throw new Error('같은 정보원은 10분 후 다시 수집할 수 있습니다.');
  try{
    const count=await db.prepare('SELECT COUNT(*) AS n FROM news_candidates').first();
    
    const collection=await loadCandidates(source),items=collection.items;
    const matched=items.filter(a=>a.groups.length).slice(0,30);
    const known=await db.prepare('SELECT url FROM news_candidates').all();
    const knownUrls=new Set(known.results.map(r=>r.url));
    let available=Math.max(0,500-count.n);
    const selected=matched.filter(a=>knownUrls.has(a.url)||available>0&&(available--,true));
    const warning=selected.length<matched.length?'후보 저장 상한 500건으로 일부 새 기사를 저장하지 못했습니다.':'';
    const results=selected.length?await db.batch(selected.map(a=>db.prepare("INSERT INTO news_candidates(source_id,source_name,title,url,suggested_category,matched_keyword_groups_json,snippet) VALUES(?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET source_id=excluded.source_id,source_name=excluded.source_name,title=excluded.title,snippet=CASE WHEN news_candidates.fetch_status='success' THEN news_candidates.snippet ELSE excluded.snippet END,suggested_category=excluded.suggested_category,matched_keyword_groups_json=excluded.matched_keyword_groups_json,processing_status=CASE WHEN excluded.suggested_category IS NOT NULL THEN 'pending' ELSE 'excluded' END,fetch_status=CASE WHEN news_candidates.fetch_status='error' THEN 'pending' ELSE news_candidates.fetch_status END,last_collected_at=CURRENT_TIMESTAMP").bind(source.id,source.name,a.title,a.url,a.category,JSON.stringify(a.groups),JSON.stringify({match_level:a.matchLevel,config_version:""})))):[];
    const saved=results.reduce((n,r,i)=>n+(!knownUrls.has(selected[i].url)?(r.meta?.changes||0):0),0);
    await db.prepare("UPDATE collection_runs SET finished_at=CURRENT_TIMESTAMP,run_status='success',found_count=?,saved_count=? WHERE id=?").bind(items.length,saved,run.id).run();
    return {source:source.label||source.name,found:items.length,selected:selected.length,saved,lists:1,warning};
  }catch(error){
    await db.prepare("UPDATE collection_runs SET finished_at=CURRENT_TIMESTAMP,run_status='error',error_message=? WHERE id=?").bind(String(error.message).slice(0,300),run.id).run();throw error;
  }
}
async function readOneBody(db,source,articleId=null){
  const candidate=await db.prepare("UPDATE news_candidates SET body_fetched_at=CURRENT_TIMESTAMP WHERE id=(SELECT id FROM news_candidates WHERE source_id=? AND source_name=? AND (? IS NULL OR id=?) AND expires_at>CURRENT_TIMESTAMP AND processing_status='pending' AND (fetch_status='pending' OR (fetch_status='success' AND snippet NOT LIKE ?)) AND (body_fetched_at IS NULL OR body_fetched_at<=datetime('now','-1 minute')) ORDER BY CASE WHEN snippet LIKE '%\"match_level\":\"full\"%' THEN 0 ELSE 1 END,first_collected_at ASC,id ASC LIMIT 1) RETURNING id,title,url,published_date,snippet,body_text").bind(source.id,source.name,articleId,articleId,'%"config_version":"'+CONFIG_VERSION+'"%').first();
  if(!candidate)return {message:'처리할 기사 없음'};
  const groups=keywordMatch(candidate.title,source);
  if(!groups.length){await db.prepare("UPDATE news_candidates SET processing_status='excluded',suggested_category=NULL,matched_keyword_groups_json='[]' WHERE id=?").bind(candidate.id).run();return {skipped:true};}
  let detail;
  const cached=parseExcerpt(candidate.snippet);
  if(cached.first_paragraph&&candidate.published_date){detail={date:candidate.published_date,body:candidate.body_text||'',excerpt:cached,error:''};}
  else try{detail=articleDetails(await readArticleHtml(candidate.url,source),source,candidate.title);}catch(e){detail={date:null,body:'',error:String(e.message).slice(0,300)};}
  if(detail.error){await db.prepare("UPDATE news_candidates SET published_date=COALESCE(?,published_date),fetch_status='error',fetch_error=?,body_fetched_at=CURRENT_TIMESTAMP,suggested_category=?,matched_keyword_groups_json=? WHERE id=?").bind(detail.date,detail.error,groups[0].category,JSON.stringify(groups.map(g=>g.id)),candidate.id).run();}
  else{
    detail.excerpt={...detail.excerpt,source_id:source.id,config_version:CONFIG_VERSION,match_level:selectionLevel(groups)};
    await saveExcerptArticle(db,source,candidate,detail,groups);
    await db.prepare("UPDATE news_candidates SET published_date=COALESCE(?,published_date),body_text=?,snippet=?,fetch_status='success',fetch_error='',body_fetched_at=CURRENT_TIMESTAMP,suggested_category=?,matched_keyword_groups_json=? WHERE id=?").bind(detail.date,detail.body,JSON.stringify(detail.excerpt),groups[0].category,JSON.stringify(groups.map(g=>g.id)),candidate.id).run();
  }
  return {source:source.label||source.name,title:candidate.title,published_date:detail.date,groups:groups.map(g=>g.id),error:detail.error};
}
function parseExcerpt(value){
  try{const x=JSON.parse(value||'');if(x.format==='excerpt')return {format:'excerpt',excerpt_version:x.excerpt_version,source_id:x.source_id,config_version:x.config_version,subtitle:String(x.subtitle||''),first_paragraph:String(x.first_paragraph||'')};}catch{}
  return {format:'excerpt',subtitle:'',first_paragraph:''};
}
function sourcesForArticle(row){
  const preferred=parseExcerpt(row.summary).source_id;
  return NEWS_SOURCES.filter(s=>hostOf(row.url)===hostOf(s.url)&&((s.id===preferred)||s.name===row.source)).sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred));
}

function htmlSection(html, key, type='id') {
  const open = new RegExp('<(div|section|article|h[1-6]|p|strong|span|ul|ol|li|dl|dt|dd|time)\\b[^>]*\\b'+type+'=["\'][^"\']*["\'][^>]*>', 'gi');
  let m;
  while ((m=open.exec(html))) {
    const attr=m[0].match(new RegExp('\\b'+type+'=["\']([^"\']*)["\']','i'));
    if (!attr || (type==='id' ? attr[1]!==key : !attr[1].split(/\s+/).includes(key))) continue;
    const tags=new RegExp('</?'+m[1]+'\\b[^>]*>','gi');
    tags.lastIndex=open.lastIndex;
    let depth=1, end;
    while ((end=tags.exec(html))) {
      depth += end[0].startsWith('</') ? -1 : 1;
      if (!depth) return html.slice(open.lastIndex,end.index);
    }
    return '';
  }
  return '';
}
function normalizedDate(value){
  const m=String(value||'').match(/\b(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})(?!\d)/);if(!m)return null;
  const iso=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'),d=new Date(iso+'T00:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:null;
}
function attributeValue(tag,name){return tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\'])([\\s\\S]*?)\\1','i'))?.[2]||'';}
function articleDetails(html,source,titleHint=''){
  if(source.kind==='mfds'){const start=html.indexOf('<!-- s:bbs_view01 -->'),end=html.indexOf('<!-- e:bbs_view01 -->',start);if(start>=0&&end>start)html=html.slice(start,end);}
  const clean=html.replace(/<(script|style|iframe|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
  let date=null;
  for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
    if(['article:published_time','date','datePublished','pubdate'].includes(attributeValue(m[0],'property')||attributeValue(m[0],'name'))){date=normalizedDate(attributeValue(m[0],'content'));if(date)break;}
  }
  if(!date){
    for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      try{const parsed=JSON.parse(script[1]);const queue=Array.isArray(parsed)?parsed:[parsed];for(const item of queue){if(Array.isArray(item['@graph']))queue.push(...item['@graph']);if(/NewsArticle|Article|ReportageNewsArticle/.test(String(item['@type']||''))){date=normalizedDate(item.datePublished);if(date)break;}}}catch{}
      if(date)break;
    }
  }
  const id=key=>htmlSection(clean,key),cls=key=>htmlSection(clean,key,'class');
  if(!date){
    const headerReaders={gate:()=>cls('newsinfo'),medicaltimes:()=>cls('date_info'),mohw:()=>htmlSection(cls('board_view'),'info','class'),mfds:()=>cls('bv_txt01')||cls('bv_info'),hira:()=>htmlSection(cls('viewCont'),'writer','class'),amc:()=>cls('contViewTit'),yakup:()=>cls('info_con'),whosaeng:()=>cls('view_info')};
    const header=headerReaders[source.kind]?.()||'';
    if(source.kind==='gate'){const v=decodeText(header).match(/기사입력시간\s*(\d{2}[.\/-]\d{2}[.\/-]\d{2})/)?.[1];if(v)date=normalizedDate('20'+v);}
    else date=normalizedDate(decodeText(header));
    if(!date&&source.kind==='mfds')date=normalizedDate(decodeText(clean).match(/등록일\s*[:：]?\s*(20\d{2}[-.]\d{1,2}[-.]\d{1,2})/)?.[1]);
  }
  let section='';
  const selectors={
    bosa:[['id','article-view-content-div']],gate:[['class','contarea']],medicaltimes:[['class','view_cont']],
    dailypharm:[['id','newsContent']],mohw:[['scoped','mohw']],mfds:[['class','bv_cont']],hira:[['scoped','hira']],
    nhis:[['class','post-content']],kha:[['class','board-view__txt']],sev:[['class','fr-view']],amc:[['class','editArea']],
    yakup:[['class','article_text_con']],yna:[['class','story-news']],
    medipana:[['id','articleBody'],['id','article-view-content-div'],['class','article-content']],
    whosaeng:[['id','textinput'],['id','news_body_area'],['class','news_body']],
    etnews:[['id','articleBody']],snuh:[['class','boardViewContents'],['class','viewContent']],cmc:[['class','board-view__txt'],['class','board-view-content']]
  }[source.kind]||[];
  for(const [type,key] of selectors){section=type==='id'?id(key):type==='class'?cls(key):key==='mohw'?htmlSection(cls('board_view'),'contents','class'):htmlSection(cls('viewCont'),'view','class');if(decodeText(section).length>=50)break;}
  const titleMeta=[...clean.matchAll(/<meta\b[^>]*>/gi)].find(m=>attributeValue(m[0],'property')==='og:title');
  const mainTitle=titleHint||attributeValue(titleMeta?.[0]||'','content');
  const fold=value=>decodeText(value).replace(/[^\p{L}\p{N}]/gu,'');
  section=section.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi,(whole,attrs,text)=>{const normalized=fold(text);if(mainTitle&&normalized&&normalized===fold(mainTitle))return '';if(['hira','mohw','mfds'].includes(source.kind)&&/text-align\s*:\s*center/i.test(attrs))return '';return whole;});
  const body=decodeText(section);
  if(body.length<50||(body.match(/[가-힣]/g)||[]).length<15)return {date,body:'',error:'공개 본문을 찾지 못했습니다. 첨부파일·로그인·동적 본문 또는 페이지 구조를 확인해 주세요.'};
  if(body.length>20000)return {date,body:'',error:'본문 20,000자 제한을 초과했습니다.'};
  const heading=decodeText(clean.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1]||'');
  if(heading){section=section.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/i,(whole,text)=>decodeText(text)===heading?'':whole);}
  const excerpt=excerptFromHtml(clean,section,source);
  if(source.kind==='yakup')excerpt.subtitle=decodeText(cls('sstitle_con')).slice(0,400);
  if(!excerpt.first_paragraph)return {date,body:'',error:'첫 문단을 확인하지 못했습니다.'};
  return {date,body,excerpt,error:''};
}
function excerptFromHtml(clean, section, source) {
  const keys = {
    bosa: ['article-head-sub'],
    gate: ['subtxt'],
    medicaltimes: ['subTit'],
    daily: ['view_subtitle', 'view_sub_title'],
    kmib: ['article_subtitle', 'sub_title']
  }[source.kind] || [];

  const readable = value => decodeText(value)
    .replace(/&middot;/g, '·')
    .replace(/&(lsquo|rsquo);/g, "'")
    .replace(/&(ldquo|rdquo);/g, '"');

  let subtitle = '';
  for (const key of keys) {
    subtitle = readable(htmlSection(clean, key, 'class'));
    if (subtitle) break;
  }

  const content = section
    .replace(/<(figure|figcaption)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(span|b|strong|em|i|u|a|font)\b[^>]*>|<\/(span|b|strong|em|i|u|a|font)\s*>/gi, '')
    .replace(/\r?\n/g, ' ');

  const valid = text =>
    text.length >= 8 &&
    !/^(사진|자료|출처)\s*[=:：]/.test(text) &&
    !/^\[[^\]]+\]$/.test(text);

  const splitParagraphs = value => value
    .replace(/(?:<br\s*\/?\s*>(?:\s|&nbsp;|&#160;)*){2,}/gi, '\n')
    .replace(/<\/(?:div|section)\s*>/gi, '\n')
    .split('\n')
    .map(readable);

  let firstParagraph = '';
  for (const p of content.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p\s*>/gi)) {
    if (/caption|photo|credit/i.test(p[1])) continue;
    firstParagraph = splitParagraphs(p[2]).find(valid) || '';
    if (firstParagraph) break;
  }

  if (!firstParagraph) {
    firstParagraph = content
      .replace(/<br\s*\/?\s*>|<\/(?:div|p|section)\s*>/gi, '\n')
      .split('\n')
      .map(readable)
      .find(valid) || '';
  }

  const limit = 300;
  if (firstParagraph.length > limit) {
    firstParagraph = firstParagraph.slice(0, limit - 1).trimEnd() + '…';
  }

  return {
    format: 'excerpt',
    excerpt_version: 2,
    subtitle: subtitle.slice(0, 400),
    first_paragraph: firstParagraph
  };
}
function titleSelection(title,source){
  const groups=keywordMatch(title,source),level=selectionLevel(groups);
  return {groups,level,reasons:groups.map(rule=>{
    const name=CATEGORY_CONFIG.find(c=>c.id===rule.category)?.name||rule.category;
    return name+' · '+rule.mainMatches.slice(0,3).join(', ')+(rule.auxiliaryMatches.length?' + '+rule.auxiliaryMatches.slice(0,3).join(', '):'')+' · '+rule.id;
  })};
}
async function saveExcerptArticle(db,source,candidate,detail,groups){
  if(!groups.length||!detail.date||!detail.excerpt.first_paragraph)return;
  const tags=articleTags(groups);
  await db.prepare("INSERT INTO articles (category,entity,published_date,source,title,url,summary,tags_json,policy_tracking_json,summary_origin,review_status,is_sample) VALUES (?,?,?,?,?,?,?,?,NULL,'manual','published',0) ON CONFLICT(url) DO UPDATE SET category=excluded.category,entity=excluded.entity,published_date=excluded.published_date,title=excluded.title,summary=excluded.summary,tags_json=excluded.tags_json,policy_tracking_json=NULL,summary_origin='manual',review_status='published',is_sample=0,updated_at=CURRENT_TIMESTAMP").bind(groups[0].category,groups[0].mainMatches[0]||'',detail.date,source.name,candidate.title,candidate.url,JSON.stringify(detail.excerpt),JSON.stringify(tags)).run();
}
function explainSelection(row){
  const source=NEWS_SOURCES.find(s=>s.id===row.source_id);
  if(!source||source.name!==row.source_name||hostOf(row.url)!==hostOf(source.url))return {selected:false,level:'none',reasons:[]};
  const selected=titleSelection(row.title,source);
  return {selected:selected.groups.length>0,level:selected.level,reasons:selected.reasons};
}
const COLLECT_PANEL = `<section class="section"><div class="section-head"><h2>기사 수집</h2></div><p>목록·원문·발행일을 확인합니다.</p><div class="controls"><select id="collect-source" aria-label="정보원">${NEWS_SOURCES.map(s=>'<option value="'+s.id+'">'+(s.label||s.name)+'</option>').join('')}</select><button class="reset" id="collect-button">기사 수집</button><label style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;cursor:pointer">메인 일치 기사 <input type="checkbox" id="show-other" style="min-width:0;width:18px;height:18px;flex:none;padding:0;margin:0"></label></div><p id="collect-result" role="status" aria-live="polite"></p><p id="selection-count"></p><div id="candidate-list"></div></section>
<script>
(function(){
 const select=document.getElementById('collect-source');
 const button=document.getElementById('collect-button');
 const resultBox=document.getElementById('collect-result');
 const toggle=document.getElementById('show-other');
 let rows=[];
 async function api(path,input){const r=await fetch(path,input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{});let d;const raw=await r.text();try{d=JSON.parse(raw);}catch(e){if(/1102|exceeded.*(CPU|resource)|CPU.*limit/i.test(raw))throw new Error('Cloudflare 실행 자원 한도를 초과했습니다.');throw new Error('응답을 확인하지 못했습니다. 새로고침하고 로그인 상태를 확인해 주세요.');}if(!r.ok)throw new Error(d.error||'처리 실패');return d;}
 function render(){
  const box=document.getElementById('candidate-list');box.replaceChildren();
  const selected=rows.filter(function(a){return a.selection.level==='full';});
  const mainOnly=rows.filter(function(a){return a.selection.level==='main';});
  const unknown=rows.filter(function(a){return a.fetch_status==='success'&&!a.published_date;}).length;
  document.getElementById('selection-count').textContent='우선 선별 '+selected.length+' · 메인 일치 '+mainOnly.length+' · 처리 중 '+rows.filter(function(a){return a.fetch_status==='pending';}).length+' · 실패 '+rows.filter(function(a){return a.fetch_status==='error';}).length+' · 날짜 미확인 '+unknown;
  (toggle.checked?rows.filter(function(a){return a.selection.selected;}):selected).forEach(function(a){
   const item=document.createElement('div');item.style.cssText='padding:12px 0;border-bottom:1px solid #e0e5ec';
   const link=document.createElement('a');link.textContent=a.source_name+' · '+a.title;link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';item.append(link);
   const info=document.createElement('div');info.style.cssText='font-size:13px;color:#657285';info.textContent='발행일 '+(a.published_date||'미확인')+' · '+(a.selection.level==='full'?'우선 선별':'메인 일치')+(a.fetch_status==='error'?' · 내용 확인 실패':a.fetch_status==='pending'?' · 처리 중':'');item.append(info);
   const reason=document.createElement('div');reason.style.fontSize='13px';reason.textContent=(a.selection.reasons.length?'기준: '+a.selection.reasons.join(' / '):'')+(a.fetch_error?' · '+a.fetch_error:'');item.append(reason);
   if(a.excerpt.subtitle){const sub=document.createElement('p');sub.textContent=a.excerpt.subtitle;sub.style.cssText='font-weight:600;margin:8px 0';item.append(sub);}
   if(a.excerpt.first_paragraph){const lead=document.createElement('p');lead.textContent=a.excerpt.first_paragraph;lead.style.cssText='font-size:14px;margin:8px 0';item.append(lead);}
   box.append(item);
  });
  if(!selected.length&&!toggle.checked){const p=document.createElement('p');p.textContent='우선 선별 기사가 없습니다. 메인 일치 기사를 확인해 주세요.';box.append(p);}
 }
 async function refresh(){const d=await api('/api/candidates?source_id='+encodeURIComponent(select.value));rows=d.candidates;render();}
 select.onchange=async function(){rows=[];render();try{await refresh();resultBox.textContent='저장된 기사입니다.';}catch(e){resultBox.textContent=e.message;}};
 toggle.onchange=render;
 button.onclick=async function(){
  button.disabled=true;select.disabled=true;resultBox.textContent='수집 중…';
  try {
   let notice='';
   try{const c=await api('/api/collect',{source_id:select.value});notice='새 기사 '+c.saved+'건'+(c.warning?' · '+c.warning:'');}
   catch(e){if(!e.message.includes('10분 후'))throw e;notice='저장된 기사를 처리합니다.';}
   let success=0,failed=0;
   for(let i=0;i<30;i++){
    resultBox.textContent=notice+' · 확인 중 '+(i+1)+'/30';
    const d=await api('/api/read-body',{source_id:select.value});
    if(d.message)break;
    if(d.skipped)continue;
    if(d.error)failed++;else success++;
   }
   await refresh();resultBox.textContent=notice+' · 확인 '+success+'건 · 실패 '+failed+'건 · 완료';
   document.getElementById('collect-result').append(' · 상단 기사 갱신은 새로고침');
  }catch(e){resultBox.textContent=e.message;try{await refresh();}catch(ignore){}}
  finally{button.disabled=false;select.disabled=false;}
 };
 refresh().catch(function(e){resultBox.textContent=e.message;});
})();
</script>`;
// 예약 설정: 정보원 목록은 한국시간 하루 1회, 오전 7시 이후 순서대로 확인합니다.
const AUTO_ORDER=['S012','S018','S002','S015','S004','S007','S011','S021','S025','S024','S023','S027'];
const AUTO_START_HOUR=7;
function automationSettings(env){
  const integer=(value,fallback,min,max)=>{const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
  return {enabled:String(env.AUTO_ENABLED||'false').toLowerCase()==='true',sourceLimit:integer(env.AUTO_SOURCE_LIMIT,12,1,12),maxBodies:integer(env.AUTO_MAX_BODY_PER_DAY,120,1,240)};
}
function automationSources(env){return AUTO_ORDER.map(id=>NEWS_SOURCES.find(s=>s.id===id)).filter(Boolean).slice(0,automationSettings(env).sourceLimit);}
function koreanClock(time=Date.now()){const d=new Date(time+9*60*60*1000);return {day:d.toISOString().slice(0,10),hour:d.getUTCHours()};}
function missingAutomationTable(error){return /no such table.*monitor_(control|jobs)/i.test(String(error?.message||error));}
async function withCollectorLock(env,task){
  const token=crypto.randomUUID(),now=Date.now();
  let lock;
  try{lock=await env.DB.prepare('UPDATE monitor_control SET lock_token=?,lock_until=? WHERE id=1 AND lock_until<=? RETURNING id').bind(token,now+120000,now).first();}
  catch(error){if(missingAutomationTable(error))throw new Error('예약 수집용 SQL을 D1에서 먼저 실행해 주세요.');throw error;}
  if(!lock)throw new Error('다른 수집 작업이 실행 중입니다. 잠시 후 다시 시도해 주세요.');
  try{return await task();}
  finally{await env.DB.prepare("UPDATE monitor_control SET lock_token='',lock_until=0 WHERE id=1 AND lock_token=?").bind(token).run();}
}
async function automationStatus(env){
  const settings=automationSettings(env),sources=automationSources(env),{day}=koreanClock();
  try{
    const control=await env.DB.prepare('SELECT pause_day,last_tick,last_message FROM monitor_control WHERE id=1').first();
    if(!control)return {setupRequired:true,settings};
    const jobs=await env.DB.prepare('SELECT kind,source_id,status,message,started_at,finished_at FROM monitor_jobs WHERE run_day=? ORDER BY started_at DESC,job_key DESC LIMIT 260').bind(day).all();
    const rows=jobs.results,active=new Set(sources.map(s=>s.id));
    return {setupRequired:false,settings,day,paused:control.pause_day===day,last_tick:control.last_tick,last_message:control.last_message,source_count:sources.length,sources:sources.map(s=>s.label||s.name),lists_done:rows.filter(r=>r.kind==='list'&&active.has(r.source_id)).length,bodies_done:rows.filter(r=>r.kind==='body').length,failed:rows.filter(r=>['error','aborted'].includes(r.status)).length,recent:rows.slice(0,8).map(r=>({...r,source:SOURCE_CONFIG.find(s=>s.id===r.source_id)?.label||r.source_id}))};
  }catch(error){if(missingAutomationTable(error))return {setupRequired:true,settings};throw error;}
}
async function runScheduledStep(env,time=Date.now(),manualTest=false){
  const settings=automationSettings(env),{day,hour}=koreanClock(time);
  if(!manualTest&&!settings.enabled)return {status:'disabled',message:'자동 수집 꺼짐'};
  if(!manualTest&&hour<AUTO_START_HOUR)return {status:'waiting',message:'한국시간 오전 7시부터 처리합니다.'};
  if(!env?.DB)throw new Error('DB 연결이 필요합니다.');
  return withCollectorLock(env,async()=>{
    const db=env.DB,sources=automationSources(env);
    await db.prepare("UPDATE monitor_jobs SET status='aborted',finished_at=CURRENT_TIMESTAMP,message='이전 작업이 완료되지 않았습니다. 실행 한도·오류 로그를 확인해 주세요.' WHERE status='running' AND started_at<=datetime('now','-3 minutes')").run();
    const control=await db.prepare('SELECT pause_day FROM monitor_control WHERE id=1').first();
    // 이전 버전에서 수동 수집 재사용으로 건너뛴 목록만 다시 실행 대상으로 돌립니다.
    await db.prepare("DELETE FROM monitor_jobs WHERE run_day=? AND kind='list' AND status='skipped' AND message='오늘 수동 수집한 목록을 사용합니다.'").bind(day).run();
    const daily=(await db.prepare('SELECT job_key,kind,source_id,status FROM monitor_jobs WHERE run_day=?').bind(day).all()).results;
    if(control.pause_day===day)return {status:'paused',message:'오늘 자동 수집이 중지되어 있습니다.'};
    if(daily.filter(r=>['error','aborted'].includes(r.status)).length>=10){
      await db.prepare('UPDATE monitor_control SET pause_day=?,last_tick=CURRENT_TIMESTAMP,last_message=? WHERE id=1').bind(day,'하루 실패 10회로 오늘 자동 수집을 중지했습니다.').run();
      return {status:'paused',message:'하루 실패 10회로 중지'};
    }
    const failures=id=>daily.filter(r=>r.source_id===id&&['error','aborted'].includes(r.status)).length;
    let source=sources.find(s=>!daily.some(j=>j.kind==='list'&&j.source_id===s.id));
    let kind='list',candidate=null;
    if(!source){
      if(daily.filter(r=>r.kind==='body').length>=settings.maxBodies)return {status:'limit',message:'오늘 기사 처리 상한에 도달했습니다.'};
      kind='body';
      const eligible=sources.filter(s=>failures(s.id)<3);
      if(eligible.length){
        const where=eligible.map(()=>'(c.source_id=? AND c.source_name=?)').join(' OR ');
        const ordering=eligible.map((s,i)=>"WHEN '"+s.id+"' THEN "+i).join(' ');
        const args=eligible.flatMap(s=>[s.id,s.name]);
        candidate=await db.prepare("SELECT c.id,c.source_id FROM news_candidates c WHERE ("+where+") AND c.expires_at>CURRENT_TIMESTAMP AND c.processing_status='pending' AND (c.fetch_status='pending' OR (c.fetch_status='success' AND COALESCE(c.snippet,'') NOT LIKE ?)) AND (c.body_fetched_at IS NULL OR c.body_fetched_at<=datetime('now','-1 minute')) AND NOT EXISTS(SELECT 1 FROM monitor_jobs j WHERE j.run_day=? AND j.kind='body' AND j.article_id=c.id) ORDER BY CASE c.source_id "+ordering+" END,CASE WHEN c.snippet LIKE '%\"match_level\":\"full\"%' THEN 0 ELSE 1 END,c.first_collected_at ASC,c.id ASC LIMIT 1").bind(...args,'%"config_version":"'+CONFIG_VERSION+'"%',day).first();
        if(candidate)source=eligible.find(s=>s.id===candidate.source_id);
      }
      if(!source){await db.prepare('UPDATE monitor_control SET last_tick=CURRENT_TIMESTAMP,last_message=? WHERE id=1').bind('처리할 작업 없음').run();return {status:'idle',message:'처리할 작업 없음'};}
    }
    const jobKey=day+':'+kind+':'+(candidate?candidate.id:source.id);
    const claimed=await db.prepare("INSERT OR IGNORE INTO monitor_jobs(job_key,run_day,kind,source_id,article_id,status) VALUES(?,?,?,?,?,'running') RETURNING job_key").bind(jobKey,day,kind,source.id,candidate?.id||null).first();
    if(!claimed)return {status:'skipped',message:'이미 처리한 작업'};
    await db.prepare('UPDATE monitor_control SET last_tick=CURRENT_TIMESTAMP,last_message=? WHERE id=1').bind((source.label||source.name)+' · '+(kind==='list'?'목록 확인 중':'기사 확인 중')).run();
    try{
      let result;
      if(kind==='list'){
        if(daily.length===0)await db.prepare("DELETE FROM monitor_jobs WHERE run_day<date(?,'-7 days')").bind(day).run();
        // 수동 수집 여부와 관계없이 실제 목록을 수집합니다. 예약 작업은 하루 1회로 제한됩니다.
        result=await collectSource(db,source,true);
      }else result=await readOneBody(db,source,candidate.id);
      const failed=Boolean(result.error),message=result.error||result.warning||result.message||(kind==='list'?'목록 확인 완료 · 새 기사 '+result.saved+'건':'기사 확인 완료');
      const status=failed?'error':result.skipped||result.message?'skipped':'success';
      await db.prepare('UPDATE monitor_jobs SET status=?,message=?,finished_at=CURRENT_TIMESTAMP WHERE job_key=?').bind(status,String(message).slice(0,300),jobKey).run();
      await db.prepare('UPDATE monitor_control SET last_message=? WHERE id=1').bind((source.label||source.name)+' · '+message).run();
      return {status,kind,source:source.label||source.name,message};
    }catch(error){
      const message=String(error.message||error).slice(0,300);
      await db.prepare("UPDATE monitor_jobs SET status='error',message=?,finished_at=CURRENT_TIMESTAMP WHERE job_key=?").bind(message,jobKey).run();
      await db.prepare('UPDATE monitor_control SET last_message=? WHERE id=1').bind((source.label||source.name)+' · '+message).run();
      return {status:'error',kind,source:source.label||source.name,message};
    }
  });
}
const AUTO_PANEL=`<section class="section"><div class="section-head"><h2>예약 수집</h2></div><p id="auto-status" role="status">상태 확인 중…</p><div class="controls"><button class="reset" id="auto-refresh">상태 확인</button><button class="reset" id="auto-test">예약 작업 1회 시험</button></div><p id="auto-result" role="status"></p><div id="auto-history"></div></section>
<script>
(function(){
 const status=document.getElementById('auto-status'),result=document.getElementById('auto-result'),test=document.getElementById('auto-test');
 async function refresh(){
  const r=await fetch('/api/automation-status');let d;try{d=await r.json();}catch(e){throw new Error('예약 상태 응답을 확인하지 못했습니다.');}if(!r.ok)throw new Error(d.error||'상태 조회 실패');
  if(d.setupRequired){status.textContent='예약 수집용 D1 설정이 필요합니다.';test.disabled=true;return;}
  test.disabled=false;
  status.textContent=(d.settings.enabled?'자동 수집 켜짐':'자동 수집 꺼짐')+(d.paused?' · 오늘 오류로 중지':'')+' · 대상 '+d.source_count+'곳 · 목록 '+d.lists_done+'/'+d.source_count+' · 기사 처리 '+d.bodies_done+'/'+d.settings.maxBodies+' · 실패 '+d.failed;
  const history=document.getElementById('auto-history');history.replaceChildren();
  (d.recent||[]).forEach(function(row){const p=document.createElement('p');p.style.cssText='font-size:13px;color:#657285';const when=new Date((row.started_at||'').replace(' ','T')+'Z');p.textContent=(Number.isNaN(when.getTime())?'':when.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' · ')+row.source+' · '+(row.kind==='list'?'목록':'기사')+' · '+({running:'처리 중',success:'완료',error:'실패',aborted:'중단',skipped:'확인'}[row.status]||row.status)+' · '+(row.message||'');history.append(p);});
 }
 document.getElementById('auto-refresh').onclick=function(){refresh().catch(function(e){result.textContent=e.message;});};
 test.onclick=async function(){test.disabled=true;result.textContent='작업 한 개를 시험합니다…';try{const r=await fetch('/api/automation-step',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});let d;try{d=await r.json();}catch(e){throw new Error('실행 응답을 확인하지 못했습니다. Cloudflare 실행 로그도 확인해 주세요.');}if(!r.ok)throw new Error(d.error||'실행 실패');result.textContent=(d.source?d.source+' · ':'')+(d.message||d.status);await refresh();}catch(e){result.textContent=e.message;}finally{test.disabled=false;}};
 refresh().catch(function(e){status.textContent=e.message;});
})();
</script>`;

export default {
  async scheduled(controller,env){
    const result=await runScheduledStep(env,controller.scheduledTime);
    console.log('SMD scheduled',JSON.stringify(result));
  },
  async fetch(request, env) {
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    const json=(value,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
    const address=new URL(request.url),path=address.pathname;
    if(!env?.DB)return json({error:'Bindings의 DB 연결을 확인해주세요.'},503);
    try {
      if(path==='/api/collect'||path==='/api/read-body'||path==='/api/automation-step') {
        if(request.method!=='POST')return json({error:'POST만 허용됩니다.'},405);
        if(request.headers.get('Origin')!==address.origin||!/^application\/json\b/.test(request.headers.get('Content-Type')||''))return json({error:'사이트의 테스트 버튼으로 실행해주세요.'},403);
        const raw=await request.text();if(raw.length>200)return json({error:'요청이 너무 큽니다.'},400);
        let input;try{input=JSON.parse(raw);}catch{return json({error:'요청 형식 오류'},400);}
        if(path==='/api/automation-step')return json(await runScheduledStep(env,Date.now(),true));
        const source=NEWS_SOURCES.find(s=>s.id===input?.source_id);if(!source)return json({error:'등록되지 않은 정보원'},400);
        return json(await withCollectorLock(env,()=>path==='/api/collect'?collectSource(env.DB,source):readOneBody(env.DB,source)));
      }
      if(!['GET','HEAD'].includes(request.method))return json({error:'GET 또는 HEAD만 허용됩니다.'},405);
      if(path==='/api/automation-status')return json(await automationStatus(env));
      if(path==='/api/candidates') {
        const sourceId=address.searchParams.get('source_id');
        if(sourceId&&!NEWS_SOURCES.some(s=>s.id===sourceId))return json({error:'등록되지 않은 정보원'},400);
        const base="SELECT id,source_id,source_name,title,url,published_date,processing_status,snippet,fetch_status,fetch_error,body_text,LENGTH(body_text) AS body_length,matched_keyword_groups_json FROM news_candidates WHERE expires_at>CURRENT_TIMESTAMP";
        const selectedSource=NEWS_SOURCES.find(s=>s.id===sourceId);
        const statement=env.DB.prepare(base+(sourceId?' AND source_id=? AND source_name=?':'')+' ORDER BY first_collected_at DESC,id DESC LIMIT 50');
        const data=await (sourceId?statement.bind(sourceId,selectedSource.name):statement).all();
        return json({candidates:data.results.map(row=>{const selection=explainSelection(row);const {body_text,...rest}=row;return {...rest,selection,excerpt:parseExcerpt(row.snippet)};}).filter(row=>row.selection.selected)});
      }
      if(!['/','/index.html','/api/articles'].includes(path))return json({error:'Not found'},404);
      const result=await env.DB.prepare("SELECT id,category,entity,published_date,source,title,url,summary,tags_json,policy_tracking_json,is_sample,summary_origin FROM articles WHERE review_status='published' AND is_sample=0 ORDER BY published_date DESC,id DESC LIMIT 200").all();
      if(!result.success)throw new Error('게시 기사 조회 실패');
      const articles=result.results.filter(row=>parseExcerpt(row.summary).first_paragraph).map(row=>{const source=sourcesForArticle(row).find(s=>keywordMatch(row.title,s).length);if(!source)return null;const groups=keywordMatch(row.title,source),excerpt=parseExcerpt(row.summary);return {id:row.id,category:groups[0].category,match_level:selectionLevel(groups),entity:groups[0].mainMatches[0]||'',date:row.published_date,source:row.source,title:row.title,url:row.url,subtitle:excerpt.subtitle,summary:excerpt.first_paragraph,tags:articleTags(groups),track:null,is_sample:0,content_type:'excerpt'};}).filter(Boolean);
      if(path==='/api/articles')return json({storage:'D1',count:articles.length,limit:200,articles});
      const safeData=JSON.stringify(articles).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      const marker=/const articles\s*=\s*\[[\s\S]*?\n\];/;if(!marker.test(PAGE))throw new Error('화면 데이터 위치를 찾지 못했습니다.');
      const screen=PAGE.replace('<p class="summary">', '<p class="summary" style="white-space:pre-line">').replace("esc(a.summary)","esc((a.subtitle?a.subtitle+'\\n\\n':'')+a.summary)").replace('시범 운영 · 화면 확인용','시범 운영').replace('<strong>샘플 데이터입니다.</strong>','<strong>본문 발췌</strong>').replace('제공된 2026년 9월 주간 클리핑을 바탕으로 구성했습니다. 최신 뉴스나 현재 정책 상태를 검증한 화면이 아닙니다. 자동 수집·AI 처리·정책 후속 비교는 아직 연결되지 않았습니다.','제목 기준으로 선별한 기사의 소제목과 첫 문단을 표시합니다.').replace('기사 전문은 원문에서 확인하세요. 현재 요약은 기존 클리핑을 축약한 예시이며 AI 생성 결과가 아닙니다.','기사 전문은 원문에서 확인하세요.').replace('샘플 기사 ','기사 ').replace('검색 조건에 해당하는 샘플 기사가 없습니다.','표시할 기사가 없습니다.').replace('제공된 클리핑에는 우리회사 뉴스가 없습니다. 수집할 공개 정보원을 연결하면 이곳에 표시됩니다.','표시할 기사가 없습니다.');
      const html=screen.replace(marker,()=>'const articles = '+safeData+';').replace('건 · 자동 수집 미연결','건 · 본문 발췌').replace('</footer>',()=>'</footer>'+AUTO_PANEL+COLLECT_PANEL);
      return new Response(request.method==='HEAD'?null:html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
    }catch(error){console.error('News operation failed');return json({error:String(error.message).slice(0,300)},503);}
  }
};
