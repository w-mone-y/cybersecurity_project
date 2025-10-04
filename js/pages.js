// 课程页面交互：目录高亮、手风琴、测验、涟漪点击、卡片倾斜、滚动显现与微交互
class CourseUI {
  constructor() {
    this.observeReveal();
    this.bindTOC();
    this.bindAccordions();
    this.bindQuizzes();
    this.bindRipples();
    this.bindTilt();
  }

  // 滚动显现
  observeReveal() {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
    },{threshold:0.12});
    document.querySelectorAll('.reveal, .section-card, .quiz-card, .accordion-item').forEach(el=>io.observe(el));
  }

  // 目录高亮
  bindTOC() {
    const links = [...document.querySelectorAll('.toc a')];
    if (!links.length) return;
    const sections = links.map(a=> document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id = '#' + e.target.id;
          links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')===id));
        }
      });
    },{rootMargin:'-45% 0px -50% 0px', threshold:0});
    sections.forEach(s=>io.observe(s));
  }

  // 手风琴
  bindAccordions() {
    document.querySelectorAll('.accordion-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const item = btn.closest('.accordion-item');
        item.classList.toggle('active');
      });
    });
  }

  // 测验逻辑
  bindQuizzes() {
    document.querySelectorAll('[data-quiz]')?.forEach(card=>{
      const answer = card.getAttribute('data-answer');
      const options = card.querySelectorAll('.quiz-option');
      options.forEach(opt=>{
        opt.addEventListener('click', ()=>{
          options.forEach(o=>o.classList.remove('correct','wrong'));
          const val = opt.getAttribute('data-value');
          opt.classList.add(val===answer ? 'correct' : 'wrong');
          if (val===answer) this.confetti(card);
        });
      });
    });
  }

  // 简易纸花特效
  confetti(container) {
    const c = document.createElement('canvas');
    c.width = container.clientWidth; c.height = 120; c.style.width='100%'; c.style.height='120px';
    c.style.display='block'; c.style.marginTop='6px';
    const ctx = c.getContext('2d');
    container.appendChild(c);
    const parts = Array.from({length:60}, ()=>({
      x: Math.random()*c.width,
      y: -10 - Math.random()*40,
      r: 2+Math.random()*3,
      vx: -1+Math.random()*2,
      vy: 2+Math.random()*2.5,
      color: `hsl(${Math.random()*360},90%,60%)`
    }));
    let t=0; (function ani(){
      ctx.clearRect(0,0,c.width,c.height);
      parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
      t++; if(t<90) requestAnimationFrame(ani); else c.remove();
    })();
  }

  // 涟漪点击
  bindRipples() {
    document.querySelectorAll('.btn, .quiz-option, .accordion-btn').forEach(el=>{
      el.classList.add('ripple');
      el.addEventListener('click', (e)=>{
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--ripple-x', (e.clientX-rect.left)+'px');
        el.style.setProperty('--ripple-y', (e.clientY-rect.top)+'px');
        el.classList.add('is-animating');
        setTimeout(()=> el.classList.remove('is-animating'), 500);
      });
    });
  }

  // 轻量卡片倾斜
  bindTilt() {
    const cards = document.querySelectorAll('.tilt');
    cards.forEach(card=>{
      card.addEventListener('mousemove', (e)=>{
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left; const y = e.clientY - r.top;
        const rx = ((y/r.height)-0.5)*-8; const ry = ((x/r.width)-0.5)*8;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener('mouseleave', ()=>{ card.style.transform='perspective(800px) rotateX(0) rotateY(0)'; });
    });
  }
}

window.addEventListener('DOMContentLoaded', ()=> new CourseUI());
