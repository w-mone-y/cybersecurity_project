// 简易 i18n：从 localStorage 读取 lang（默认zh/en），加载 i18n/{lang}.json 替换 [data-i18n]
(function(){
  const STORAGE_KEY = 'lang';
  const DEFAULT_LANG = (navigator.language||'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  let current = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

  async function loadDict(lang){
    try {
      const res = await fetch(`../i18n/${lang}.json`).catch(()=>fetch(`./i18n/${lang}.json`));
      return await res.json();
    } catch(e){ return {}; }
  }

  function apply(dict){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    // 替换按钮文字
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
  }

  async function setupToggle(){
    const btn = document.getElementById('lang-toggle');
    if (!btn) return;
    const dict = await loadDict(current);
    apply(dict);
    btn.textContent = current === 'zh' ? 'EN' : '中';
    btn.addEventListener('click', async ()=>{
      current = current === 'zh' ? 'en' : 'zh';
      localStorage.setItem(STORAGE_KEY, current);
      const dict2 = await loadDict(current);
      apply(dict2);
      btn.textContent = current === 'zh' ? 'EN' : '中';
    });
  }

  document.addEventListener('DOMContentLoaded', setupToggle);
})();
