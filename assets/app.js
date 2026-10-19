(function () {
  'use strict';
  const data = window.PORTFOLIO;
  const core = {
    escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    projects(category, expanded) { const all = category === 'todos' ? data.projects : data.projects.filter(p => p.category === category); return { total: all.length, visible: category === 'todos' && !expanded ? all.slice(0, 6) : all }; },
    mail(intent, name, message) { const topic = intent === 'oportunidade' ? 'Uma oportunidade para você' : 'Vamos conversar sobre um projeto'; return 'mailto:' + data.email + '?subject=' + encodeURIComponent(topic + ' — ' + name.trim()) + '&body=' + encodeURIComponent('Olá, Vinícius!\n\nMeu nome é ' + name.trim() + '.\n\n' + message.trim() + '\n\nVamos conversar?'); }
  };
  window.PortfolioCore = core;
  if (typeof document === 'undefined') return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const esc = core.escape;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  let motionAllowedByUser = false;
  try {
    const savedMotion = localStorage.getItem('portfolio:motion');
    motionAllowedByUser = savedMotion === 'on';
    userPaused = savedMotion === 'off';
  } catch { /* O site também funciona sem armazenamento local. */ }
  let activeFilter = 'todos';
  let expanded = false;
  let toastTimeout;
  const isPaused = () => userPaused || (reduceMotion.matches && !motionAllowedByUser);
  function toggleMotion() {
    if (isPaused()) { userPaused = false; motionAllowedByUser = true; }
    else userPaused = true;
    try { localStorage.setItem('portfolio:motion',isPaused()?'off':'on'); } catch { /* Preferência válida durante esta visita. */ }
    document.dispatchEvent(new Event('portfolio:motionchange'));
  }

  function projectMarkup(project, index) {
    const illustration = project.image.endsWith('.svg');
    const publicLink = project.url || project.code;
    const actionLabel = project.url ? 'Visitar site' : 'Ver código';
    return `<article class="project-card entering" style="--card-accent:${esc(project.color)};animation-delay:${Math.min(index, 3) * 55}ms">
      <button class="project-cover ${illustration ? 'illustration' : ''}" data-project="${esc(project.id)}" aria-label="Conhecer o projeto ${esc(project.name)}">
        ${illustration ? '' : '<span class="cover-window"><span class="mini-browser" aria-hidden="true"><i></i><i></i><i></i><b>' + esc(project.name) + '</b></span>'}
        <img src="${esc(project.image)}" alt="${esc(project.imageAlt)}" loading="lazy" decoding="async" width="1360" height="926">
        ${illustration ? '' : '</span>'}<span class="cover-tag">${esc(project.status)}</span><span class="cover-action" aria-hidden="true">↗</span>
      </button><div class="project-info"><div class="project-meta"><span>${esc(project.kind)}</span><span>${String(index + 1).padStart(2,'0')}</span></div>
      <div class="project-title-row"><h3><button data-project="${esc(project.id)}">${esc(project.name)}</button></h3>${publicLink ? `<a class="direct-link" href="${esc(publicLink)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(actionLabel + ': ' + project.name)}">${actionLabel} <span aria-hidden="true">↗</span></a>` : '<button class="direct-link" data-project="' + esc(project.id) + '">Conhecer projeto <span aria-hidden="true">↗</span></button>'}</div>
      <p class="project-description">${esc(project.description)}</p><div class="tag-list">${project.tags.slice(0,4).map(t => '<span>' + esc(t) + '</span>').join('')}</div></div></article>`;
  }
  function renderProjects() {
    const results = core.projects(activeFilter, expanded);
    $('#project-grid').innerHTML = results.visible.map(projectMarkup).join('');
    $('#project-counter').textContent = `${String(results.visible.length).padStart(2, '0')} de ${String(results.total).padStart(2, '0')} projetos`;
    const more = $('#show-more');
    more.hidden = activeFilter !== 'todos' || results.total <= 6;
    more.innerHTML = expanded ? 'Mostrar os destaques <span aria-hidden="true">−</span>' : `Explorar todos os ${data.projects.length} projetos <span aria-hidden="true">＋</span>`;
    more.setAttribute('aria-expanded', String(expanded));
    more.setAttribute('aria-controls', 'project-grid');
    $$('.filter').forEach(button => { const selected = button.dataset.filter === activeFilter; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); });
  }
  function renderCertificates() {
    $('#certificate-grid').innerHTML = data.certificates.map((c, index) => `<article class="certificate-slide" role="listitem"><button class="certificate-card" type="button" data-certificate="${esc(c.id)}" aria-label="Ampliar certificado de ${esc(c.name)}, FIAP, ${c.hours} horas"><span class="certificate-preview"><img src="${esc(c.image)}" alt="Certificado de ${esc(c.name)} emitido pela FIAP para Vinícius Pacheco Ruiz" loading="lazy" decoding="async" width="${c.width}" height="${c.height}"><span class="certificate-zoom" aria-hidden="true">Ampliar ↗</span></span><span class="certificate-copy"><span class="certificate-kicker"><span>CERTIFICADO · FIAP</span><span>${String(index + 1).padStart(2, '0')} / 06</span></span><span class="certificate-name">${esc(c.name)}</span><span class="certificate-meta"><span>${c.hours} horas</span><time datetime="${esc(c.date)}">${esc(c.dateLabel)}</time></span></span></button></article>`).join('');
  }
  function initCertificateCarousel() {
    const track = $('#certificate-grid');
    const previous = $('#certificate-prev');
    const next = $('#certificate-next');
    const position = $('#certificate-position');
    const toggle = $('#certificate-autoplay');
    let pending = false, frame = null, lastTime = null, direction = 1;
    let localPaused = false, touching = false, focused = false;
    let visible = !('IntersectionObserver' in window), running = false;
    let offset = track.scrollLeft, cooldownUntil = 0, resumeTimer;
    const maximum = () => Math.max(0,track.scrollWidth-track.clientWidth);
    const canRun = () => !localPaused && !isPaused() && visible && !document.hidden && !touching && !focused && !document.querySelector('dialog[open]') && performance.now() >= cooldownUntil && maximum() > 2;
    function update() {
      pending = false;
      const rect = track.getBoundingClientRect();
      const visible = Array.from(track.children).map((card, index) => ({index, rect:card.getBoundingClientRect()})).filter(card => card.rect.right > rect.left + 30 && card.rect.left < rect.right - 30);
      if (visible.length) {
        const first = visible[0].index + 1;
        const last = visible[visible.length - 1].index + 1;
        const label = first === last ? `${String(first).padStart(2, '0')} / 06` : `${String(first).padStart(2, '0')}–${String(last).padStart(2, '0')} / 06`;
        if (position.textContent !== label) {
          position.textContent = label;
          position.setAttribute('aria-label', first === last ? `Certificado ${first} de 6` : `Certificados ${first} a ${last} de 6`);
        }
      }
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }
    function scheduleUpdate() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    function animate(time) {
      frame = null;
      if (!canRun()) { sync(); return; }
      const delta = lastTime === null ? 0 : Math.min(50,time-lastTime);
      lastTime = time;
      offset = Math.max(0,Math.min(maximum(),offset+direction*delta*.04));
      track.scrollTo({left:offset,behavior:'instant'});
      if ((direction > 0 && offset >= maximum()) || (direction < 0 && offset <= 0)) {
        direction *= -1;
        coolDown(850);
        return;
      }
      frame = requestAnimationFrame(animate);
    }
    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; lastTime = null;
      running = canRun();
      offset = track.scrollLeft;
      position.setAttribute('aria-live',running?'off':'polite');
      toggle.disabled = false;
      toggle.setAttribute('aria-pressed',String(localPaused || isPaused()));
      toggle.setAttribute('aria-label',localPaused || isPaused()?'Ativar movimento automático dos certificados':'Pausar movimento automático dos certificados');
      toggle.textContent = isPaused() ? 'Ativar ▷' : localPaused ? 'Reproduzir ▷' : 'Pausar Ⅱ';
      track.closest('.cert-carousel').classList.toggle('is-playing',running);
      if (running) frame = requestAnimationFrame(animate);
      update();
    }
    function coolDown(milliseconds = 2800) {
      cooldownUntil = performance.now()+milliseconds;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(sync,milliseconds+20);
      sync();
    }
    function move(direction) {
      const card = track.firstElementChild;
      if (!card) return;
      coolDown();
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({left:direction * (card.getBoundingClientRect().width + gap), behavior:isPaused() ? 'instant' : 'smooth'});
    }
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    toggle.addEventListener('click',() => { if(isPaused()){localPaused=false;toggleMotion();}else localPaused=!localPaused;cooldownUntil=0;sync(); });
    track.addEventListener('scroll',() => { if (!running) offset = track.scrollLeft; scheduleUpdate(); },{passive:true});
    track.addEventListener('pointerdown',() => { touching = true; sync(); },{passive:true});
    window.addEventListener('pointerup',() => { if (touching) { touching = false; coolDown(); } },{passive:true});
    window.addEventListener('pointercancel',() => { if (touching) { touching = false; coolDown(); } },{passive:true});
    track.addEventListener('wheel',() => coolDown(),{passive:true});
    track.addEventListener('focusin',event => { focused = event.target?.matches?.(':focus-visible') ?? true; sync(); });
    track.addEventListener('focusout',() => queueMicrotask(() => { focused = track.contains(document.activeElement) && (document.activeElement?.matches?.(':focus-visible') ?? true); sync(); }));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      coolDown();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') move(event.key === 'ArrowLeft' ? -1 : 1);
      else track.scrollTo({left:event.key === 'Home' ? 0 : track.scrollWidth, behavior:isPaused() ? 'instant' : 'smooth'});
    });
    document.addEventListener('portfolio:motionchange',sync);
    document.addEventListener('portfolio:dialogchange',sync);
    document.addEventListener('visibilitychange',sync);
    reduceMotion.addEventListener('change',sync);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
    else window.addEventListener('resize',sync,{passive:true});
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); },{threshold:.01}).observe(track);
    sync();
  }
  function openDialog(dialog) {
    dialog._returnFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    document.dispatchEvent(new Event('portfolio:dialogchange'));
    dialog.scrollTop = 0;
    dialog.querySelector('[data-close]').focus({preventScroll:true});
  }
  function openProject(id) {
    const project = data.projects.find(p => p.id === id);
    if (!project) return;
    $('#project-dialog-content').innerHTML = `<img class="dialog-visual" src="${esc(project.image)}" alt="${esc(project.imageAlt)}" width="1360" height="926"><div class="dialog-body"><p class="dialog-eyebrow">${esc(project.kind)} · ${esc(project.status)}</p><h2 id="project-dialog-title">${esc(project.name)}</h2><p class="dialog-subtitle">${esc(project.subtitle)}</p><div class="dialog-actions">${project.url ? `<a class="button primary" href="${esc(project.url)}" target="_blank" rel="noopener noreferrer">Abrir projeto <span aria-hidden="true">↗</span></a>` : ''}${project.code ? `<a class="button outline" href="${esc(project.code)}" target="_blank" rel="noopener noreferrer">Explorar no GitHub <span aria-hidden="true">↗</span></a>` : ''}</div><div class="tag-list">${project.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="case-grid"><section><h3>O desafio</h3><p>${esc(project.challenge)}</p></section><section><h3>A solução</h3><p>${esc(project.solution)}</p></section><section><h3>Minha participação</h3><p>${esc(project.role)}</p></section><section><h3>O aprendizado</h3><p>${esc(project.learning)}</p></section></div><ul class="case-features">${project.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>${project.note ? `<p class="case-note">${esc(project.note)}</p>` : ''}</div>`;
    openDialog($('#project-dialog'));
  }
  function openCertificate(id) {
    const certificate = data.certificates.find(c => c.id === id);
    if (!certificate) return;
    $('#certificate-dialog-content').innerHTML = `<a class="certificate-original" href="${esc(certificate.image)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem original do certificado de ${esc(certificate.name)} em uma nova aba"><img src="${esc(certificate.image)}" alt="Certificado de ${esc(certificate.name)} emitido pela FIAP para Vinícius Pacheco Ruiz, ${certificate.hours} horas, em ${esc(certificate.dateLabel)}" width="${certificate.width}" height="${certificate.height}"></a><div class="dialog-body"><p class="dialog-eyebrow">CERTIFICADO · FIAP NANO COURSES</p><h2 id="certificate-dialog-title">${esc(certificate.name)}</h2><dl class="certificate-facts"><div><dt>Instituição</dt><dd>${esc(certificate.issuer)}</dd></div><div><dt>Carga horária</dt><dd>${certificate.hours} horas</dd></div><div><dt>Data</dt><dd><time datetime="${esc(certificate.date)}">${esc(certificate.dateLabel)}</time></dd></div></dl><div class="dialog-actions"><a class="button primary" href="${esc(data.certificateValidation)}" target="_blank" rel="noopener noreferrer">Validar na FIAP <span aria-hidden="true">↗</span></a><a class="button outline" href="${esc(certificate.image)}" download="certificado-${esc(certificate.id)}-vinicius-pacheco.png">Baixar imagem <span aria-hidden="true">↓</span></a></div><div class="credential-box"><span>CHAVE DO DIPLOMA</span><code>${esc(certificate.key)}</code><button class="text-link" data-copy-key="${esc(certificate.key)}">Copiar chave <span aria-hidden="true">▢</span></button></div><p class="certificate-description">Para consultar a autenticidade, copie a chave e informe-a no site de validação da FIAP.</p></div>`;
    openDialog($('#certificate-dialog'));
  }
  function notify(message) {
    const el = $('#toast');
    const host = document.querySelector('dialog[open]') || document.body;
    if (el.parentElement !== host) host.appendChild(el);
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  async function copyText(value, success) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(value);
      notify(success);
    } catch {
      const previous = document.activeElement;
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('aria-label','Texto para copiar');
      textarea.style.cssText = 'position:fixed;left:-10000px;top:0;';
      const host = document.querySelector('dialog[open]') || document.body;
      host.appendChild(textarea); textarea.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* A seleção manual permanece disponível no conteúdo. */ }
      textarea.remove(); previous?.focus({preventScroll:true});
      notify(copied ? success : 'Não foi possível copiar automaticamente. Selecione o texto e copie.');
    }
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (target.dataset.project) openProject(target.dataset.project);
    if (target.dataset.certificate) openCertificate(target.dataset.certificate);
    if (target.hasAttribute('data-close')) target.closest('dialog')?.close();
    if (target.dataset.copyKey) copyText(target.dataset.copyKey, 'Chave do diploma copiada.');
    if (target.dataset.filter) { activeFilter = target.dataset.filter; expanded = false; renderProjects(); }
  });
  $$('.detail-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) { document.body.classList.remove('modal-open'); const toast = $('#toast'); if (toast.parentElement !== document.body) document.body.appendChild(toast); } if (dialog._returnFocus?.isConnected) dialog._returnFocus.focus({preventScroll:true}); document.dispatchEvent(new Event('portfolio:dialogchange')); });
  });
  $('#show-more').addEventListener('click', () => { expanded = !expanded; renderProjects(); });
  $('#copy-email').addEventListener('click', () => copyText(data.email, 'E-mail copiado.'));

  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-menu');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','Abrir menu'); }
  menuButton.addEventListener('click', () => { const shouldOpen = menu.hidden; menu.hidden = !shouldOpen; menuButton.setAttribute('aria-expanded',String(shouldOpen)); menuButton.setAttribute('aria-label',shouldOpen ? 'Fechar menu' : 'Abrir menu'); });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  window.addEventListener('resize', () => { if (window.innerWidth > 800) closeMenu(); }, {passive:true});

  $('#contact-form').addEventListener('change', event => {
    if (event.target.name !== 'intent') return;
    const opportunity = event.target.value === 'oportunidade';
    $('#message-label').textContent = opportunity ? 'Me conte um pouco sobre a oportunidade' : 'Me conte um pouco sobre a ideia';
    $('#contact-message').placeholder = opportunity ? 'Qual é a equipe, a vaga ou a proposta?' : 'O que você gostaria de criar?';
    $('#prepared-email').hidden = true;
  });
  $('#contact-form').addEventListener('input', () => { $('#prepared-email').hidden = true; });
  $('#contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = $('#contact-name');
    const message = $('#contact-message');
    if (!name.value.trim()) { name.setCustomValidity('Informe seu nome.'); name.reportValidity(); name.setCustomValidity(''); return; }
    if (!message.value.trim()) { message.setCustomValidity('Escreva uma breve mensagem.'); message.reportValidity(); message.setCustomValidity(''); return; }
    const intent = form.querySelector('input[name="intent"]:checked').value;
    const href = core.mail(intent, name.value, message.value);
    const link = $('#prepared-email');
    link.href = href; link.hidden = false;
    window.location.href = href;
  });

  renderProjects();
  renderCertificates();
  initCertificateCarousel();
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-ready');
    const reveal = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); } }); }, {threshold:.08, rootMargin:'0px 0px -25px 0px'});
    $$('.reveal').forEach(el => reveal.observe(el));
    const sectionObserver = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) $$('.desktop-nav a').forEach(link => link.classList.toggle('active',link.getAttribute('href') === '#' + entry.target.id)); }); }, {rootMargin:'-15% 0px -65% 0px'});
    ['projetos','sobre','certificacoes'].forEach(id => sectionObserver.observe(document.getElementById(id)));
  }
  let ticking = false;
  function updateScroll() {
    const total = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
    $('.reading-progress').style.transform = `scaleX(${Math.min(1,Math.max(0,window.scrollY / total))})`;
    if (!isPaused() && window.scrollY < 1000) $('#hero-visual').style.setProperty('--scroll-drift', String(window.scrollY));
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateScroll); ticking = true; } }, {passive:true});
  updateScroll();

  function initSculpture(stageSelector, canvasSelector, buttonSelector) {
    const canvas = $(canvasSelector);
    const stage = $(stageSelector);
    const button = $(buttonSelector);
    const isNebula = stage.id === 'hero-visual';
    const pointerArea = isNebula ? stage.closest('.hero') : stage;
    const pointerSurface = isNebula ? pointerArea : canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.hidden = true; button.hidden = true; return; }
    let width = 600, height = 620, frame = null, visible = true, rx = 0, ry = 0, drag = null, manualRotation = 0, lastTime = null, phase = .3;
    let faceX = 0, faceY = 0, clock = 0, reactionStart = -100, reactionPower = 0;
    let nebulaHovered = false, responseTimer, reactionCount = 0;
    const response = isNebula ? $('#nebula-response') : null;
    const nebula = isNebula && window.createNebulaRenderer ? window.createNebulaRenderer(canvas) : null;
    function react(greeting = false) {
      if (!isNebula) return;
      reactionStart = clock; reactionPower = greeting ? .55 : 1;
      const messages = ['Uma ideia acende novas possibilidades.','Criatividade em expansão.','O próximo universo pode ser o nosso.'];
      response.textContent = greeting ? 'Sua curiosidade move este universo.':messages[reactionCount++%messages.length];
      clearTimeout(responseTimer);
      responseTimer = setTimeout(() => { response.textContent = 'Em movimento. Antes mesmo do primeiro clique.'; },4800);
      draw();
    }
    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1,rect.width); height = Math.max(1,rect.height);
      const ratio = Math.min(window.devicePixelRatio || 1,2.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio,0,0,ratio,0,0); draw();
    }
    function projected(u, v) {
      const r = 1.27 + .45 * Math.cos(v);
      let x = r * Math.cos(u), y = r * Math.sin(u), z = .45 * Math.sin(v) + .2 * Math.sin(3*u);
      const ay = phase + manualRotation + rx * .22;
      const ax = 1.03 + ry * .18;
      const xx = x * Math.cos(ay) + z * Math.sin(ay); z = -x * Math.sin(ay) + z * Math.cos(ay); x = xx;
      const yy = y * Math.cos(ax) - z * Math.sin(ax); z = y * Math.sin(ax) + z * Math.cos(ax); y = yy;
      const zz = -.47; const xxx = x * Math.cos(zz) - y * Math.sin(zz); y = x * Math.sin(zz) + y * Math.cos(zz); x = xxx;
      const perspective = 4.5 / (4.5 - z);
      const scale = Math.min(width * .257,height * .255);
      return {x:width*.51+x*scale*perspective,y:height*.48+y*scale*perspective,z};
    }
    function draw() {
      const paused = isPaused();
      const age = Math.max(0,clock-reactionStart);
      const pulse = paused ? 1 : Math.min(1,age/1.35);
      const energy = (nebulaHovered ? .56 : .22)+(paused ? 0 : .05*Math.sin(clock*.9)+reactionPower*Math.exp(-age*2));
      if (isNebula) {
        if (!paused) { faceX += (rx-faceX)*.085; faceY += (ry-faceY)*.085; }
        nebula?.draw({time:clock,pointerX:faceX,pointerY:faceY,rotation:manualRotation,energy,pulse,power:reactionPower,paused});
        stage.classList.toggle('nebula-engaged',nebulaHovered || age < 1.4);
        return;
      }
      stage.style.setProperty('--monogram-turn', `${Math.sin(clock*.75) * 25 + Math.sin(manualRotation) * 28}deg`);
      stage.style.setProperty('--monogram-lift', `${Math.sin(clock*1.15) * 9}px`);
      stage.style.setProperty('--monogram-pitch',`${Math.sin(clock*.67)*9}deg`);
      stage.style.setProperty('--monogram-roll',`${Math.sin(clock*.55)*4}deg`);
      ctx.clearRect(0,0,width,height);
      ctx.save();ctx.translate(width*.51,height*.48);ctx.rotate(-.44);ctx.strokeStyle='rgba(222,175,130,.12)';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(0,0,width*.42,height*.35,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      const segments = 78, rings = 19;
      const lines = [];
      for (let j=0;j<rings;j++) {
        for(let i=0;i<segments;i++) {
          const a=projected(i/segments*Math.PI*2,j/rings*Math.PI*2),b=projected((i+1)/segments*Math.PI*2,j/rings*Math.PI*2);
          lines.push({a,b,z:(a.z+b.z)*.5,along:true});
          if(i%3===0) { const c=projected(i/segments*Math.PI*2,(j+1)/rings*Math.PI*2); lines.push({a,b:c,z:(a.z+c.z)*.5,along:false}); }
        }
      }
      lines.sort((a,b)=>a.z-b.z);
      for (const line of lines) {
        const depth = Math.max(0,Math.min(1,(line.z+1.8)/3.6));
        const alpha = (line.along ? .13 : .08) + depth * (line.along ? .58 : .3);
        ctx.strokeStyle = `rgba(${Math.round(170+depth*70)},${Math.round(110+depth*85)},${Math.round(70+depth*65)},${alpha})`;
        ctx.lineWidth = line.along ? .6 + depth*.5 : .45;
        ctx.beginPath();ctx.moveTo(line.a.x,line.a.y);ctx.lineTo(line.b.x,line.b.y);ctx.stroke();
      }
      const dot=projected(.35,1.5);ctx.fillStyle='#f4dec6';ctx.shadowBlur=12;ctx.shadowColor='#e5ae86';ctx.beginPath();ctx.arc(dot.x,dot.y,2.4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    function animate(time) {
      frame=null;
      if (lastTime !== null) { const delta = Math.min(time-lastTime,40); phase += delta*.0003; clock += delta*.001; }
      lastTime=time;draw();
      if (!isPaused() && visible && !document.hidden) frame=requestAnimationFrame(animate);
    }
    function updateAnimation() {
      if(frame!==null) cancelAnimationFrame(frame);frame=null;lastTime=null;
      const paused=isPaused();
      document.documentElement.classList.toggle('motion-paused',paused);
      button.disabled=false;
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',paused?'Ativar animações':'Pausar animações');
      button.textContent=paused?'Ativar movimento ▷':'Pausar Ⅱ';
      if(paused){stage.style.setProperty('--pointer-x','0');stage.style.setProperty('--pointer-y','0');stage.style.setProperty('--scroll-drift','0');}
      draw();if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(animate);
    }
    button.addEventListener('click',toggleMotion);
    document.addEventListener('portfolio:motionchange',updateAnimation);
    reduceMotion.addEventListener('change',updateAnimation);
    document.addEventListener('visibilitychange',updateAnimation);
    if (isNebula) {
      pointerArea.addEventListener('pointerenter',event => {
        if (event.pointerType === 'touch') return;
        nebulaHovered = true;
        draw();
      });
      pointerArea.addEventListener('pointerleave',() => { nebulaHovered = false; draw(); });
      $('#galaxy-react')?.addEventListener('click',()=>{rx=.35;ry=-.15;faceX=rx;faceY=ry;react();});
      canvas.addEventListener('focus',() => { nebulaHovered = true; draw(); });
      canvas.addEventListener('blur',() => { nebulaHovered = false; draw(); });
    }
    pointerArea.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch'&&!drag)return;
      const rect=stage.getBoundingClientRect();
      rx=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));ry=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
      if(!isPaused()){stage.style.setProperty('--pointer-x',rx.toFixed(3));stage.style.setProperty('--pointer-y',ry.toFixed(3));}
      if(drag && !isPaused()){manualRotation=drag.angle+(event.clientX-drag.x)*.008;}
      if(isPaused())draw();
    },{passive:true});
    pointerArea.addEventListener('pointerleave',()=>{if(!drag){rx=0;ry=0;stage.style.setProperty('--pointer-x','0');stage.style.setProperty('--pointer-y','0');}});
    pointerSurface.addEventListener('pointerdown',event=>{
      if(isNebula && event.target?.closest?.('.hero-content,a,button,input,textarea,select,label'))return;
      drag={x:event.clientX,y:event.clientY,angle:manualRotation};pointerSurface.setPointerCapture(event.pointerId);
    });
    pointerSurface.addEventListener('pointerup',event=>{if(drag && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)react();drag=null;});pointerSurface.addEventListener('pointercancel',()=>{drag=null;});
    canvas.addEventListener('keydown',event=>{
      if(isNebula && (event.key==='Enter'||event.key===' ') && !event.repeat){event.preventDefault();react();}
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();if(!isPaused())manualRotation+=event.key==='ArrowLeft'?-.2:.2;draw();}
    });
    if('ResizeObserver' in window)new ResizeObserver(sizeCanvas).observe(stage);else window.addEventListener('resize',sizeCanvas,{passive:true});
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updateAnimation();},{threshold:0}).observe(stage);
    sizeCanvas();updateAnimation();
  }
  initSculpture('#hero-visual', '#nebula-canvas', '#motion-toggle');
  initSculpture('#about-visual', '#about-sculpture', '#about-motion-toggle');
})();
