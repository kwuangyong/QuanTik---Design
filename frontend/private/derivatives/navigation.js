(() => {
  const dialog = document.getElementById('searchBox');
  const query = document.getElementById('lookup');
  const results = document.getElementById('matches');
  const instruments = () => contracts.map((contract,i) => {
    const active = quoteBook.active(i);
    return {
      label: active.alias ? 'VN30'+active.alias+' · '+active.code : active.code,
      detail: active.expiry ? 'Đáo hạn '+active.expiry : 'CSV · '+active.sourceName,
      run() {navigate('futures');selectContract(i)}
    };
  });
  const views = ['Giá trong phiên','Basis','Đường cong kỳ hạn','Giá futures lý thuyết 3D'].map((label,i)=>({
    label, detail:'VN30 Futures', run(){navigate('futures');el('view').selectedIndex=i;chart()}
  }));
  const tools = views.concat([
    {label:'Định giá quyền chọn',detail:'Black–Scholes–Merton · Black–76 · Chứng quyền mua',run(){navigate('builtin')}},
    {label:'Kịch bản payoff',detail:'Quyền chọn · P&L theo ngày',run(){navigate('builtin');document.querySelector('.opt-scenario')?.scrollIntoView({block:'start'})}},
    {label:'Mô hình & kiểm định Futures',detail:'Ornstein–Uhlenbeck · Error correction · AR(1) · Replay CSV',run(){navigate('strategy')}},
    {label:'Nhật ký khớp mô phỏng',detail:'Replay · Truy tín hiệu, giá khớp và phí',run(){navigate('strategy');el(el('strategy-ledger').hidden?'strategy-compare':'ledger-title').focus()}},
    {label:'Chiến lược quyền chọn',detail:'Vertical Spread · Straddle · Butterfly · Iron Condor',run(){navigate('builtin');if(el('model').value==='warrant'){el('model').value='index';el('model').dispatchEvent(new Event('input',{bubbles:true}));}requestAnimationFrame(()=>el('option-playbooks')?.scrollIntoView({block:'start'}));}},
    {label:'Phòng hộ Delta',detail:'Quyền chọn · kịch bản P&L trước và sau phòng hộ',run(){navigate('builtin');document.getElementById('option-hedge')?.scrollIntoView({block:'start'})}},
    {label:'Kịch bản vị thế futures',detail:'P&L trước và sau chi phí',run(){navigate('futures');el('position-ticket').scrollIntoView({block:'start'})}},
    {label:'Phòng hộ danh mục',detail:'Beta · VN30 Futures · Kịch bản biến động',run(){navigate('futures');el('portfolio-hedge').open=true;el('portfolio-summary').focus();el('portfolio-hedge').scrollIntoView({block:'start'})}},
    {label:'Sổ kịch bản',detail:'Kịch bản futures lưu trong trình duyệt',run(){navigate('futures');el('scenario-journal').scrollIntoView({block:'start'})}},
    {label:'Code riêng',detail:'Python · Xuất snapshot',run(){navigate('custom')}}
  ]);
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  function filter(){
    const words=normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    const matchesWords=entry=>words.every(w=>normalize(entry.label+' '+entry.detail).includes(w));
    let matches=instruments().concat(tools).filter(matchesWords);
    if(words.length>1 && !matches.length){
      matches=views.flatMap((view,viewIndex)=>contracts.map((contract,index)=>({
        label:view.label+' · '+quoteTitle(quoteBook.active(index)),detail:contract.code,
        run(){el('view').selectedIndex=viewIndex;navigate('futures');selectContract(index)}
      }))).filter(matchesWords);
    }
    results.replaceChildren(...matches.map(entry=>{
      const button=document.createElement('button'), title=document.createElement('strong'), detail=document.createElement('small');
      title.textContent=entry.label;detail.textContent=entry.detail;button.append(title,detail);
      button.onclick=()=>{dialog.close();entry.run()};return button;
    }));
    if(!matches.length)results.textContent='Chưa tìm thấy mã hoặc công cụ phù hợp.';
  }
  function open(){query.value='';filter();dialog.showModal();query.focus()}
  el('find').onclick=open;el('closeSearch').onclick=()=>dialog.close();query.oninput=filter;
  query.onkeydown=e=>{if(e.key==='Enter')results.querySelector('button')?.click();if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus()}};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!dialog.open&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target.closest('input,textarea,select,[contenteditable]')){e.preventDefault();open()}});
})();
