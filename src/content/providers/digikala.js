import { getText, getLanguage } from '../modules/localization.js';
import { parsePrice } from '../modules/priceParser.js';
import { showToast } from '../modules/ui.js';

let productTitle = '';
let modal, overlay;

export function initDigikala() {
    // Try to find the target button
    // We use a polling mechanism because it's a SPA
    const interval = setInterval(() => {
      const targetBtn = findTargetButton();
      if (targetBtn && !document.querySelector('.dk-price-checker-btn')) {
        // Extract product title
        const titleEl = document.querySelector('h1');
        if (titleEl) {
          productTitle = titleEl.innerText.trim();
          const btn = createButton(targetBtn);
          createModal();
        }
      }
    }, 1000);
}

function findTargetButton() {
  // Strategy 1: Look for the "Add to Cart" button by text content
  const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
  const addToCartBtn = buttons.find(b => {
    const text = b.innerText;
    return text && (text.includes('افزودن به سبد') || text.includes('Add to cart'));
  });
  
  return addToCartBtn || null;
}

function createButton(targetBtn) {
  const btn = document.createElement('div');
  btn.className = 'dk-price-checker-btn';
  
  const btnText = document.createElement('span');
  btnText.className = 'dk-price-checker-btn-text';
  btnText.innerText = getText("btnText");
  
  btn.appendChild(btnText);
  
  const targetStyle = window.getComputedStyle(targetBtn);
  btn.style.height = targetStyle.height;
  btn.style.borderRadius = targetStyle.borderRadius;
  btn.style.width = targetStyle.width === 'auto' ? '100%' : targetStyle.width; 
  
  if (targetBtn.parentNode) {
    // Always insert after the target button without moving it.
    // This prevents conflicts with React's virtual DOM.
    const parent = targetBtn.parentNode;
    const computedStyle = window.getComputedStyle(parent);
    
    // If parent is flex row, enable wrapping so our button goes to new line
    if (computedStyle.display === 'flex' && computedStyle.flexDirection === 'row') {
      parent.style.flexWrap = 'wrap';
    }
    
    targetBtn.insertAdjacentElement('afterend', btn);
    btn.style.marginTop = '12px';
  }
  
  btn.addEventListener('click', (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    openModal();
  });
}

function createModal() {
  if (document.querySelector('.dk-pc-modal-overlay')) return;

  overlay = document.createElement('div');
  overlay.className = 'dk-pc-modal-overlay';
  
  modal = document.createElement('div');
  modal.className = 'dk-pc-modal';
  
  const header = document.createElement('div');
  header.className = 'dk-pc-header';
  
  const title = document.createElement('div');
  title.className = 'dk-pc-title';
  title.innerText = getText("appDescription");
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'dk-pc-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = closeModal;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  const tabs = document.createElement('div');
  tabs.className = 'dk-pc-tabs';
  
  const tabTorob = document.createElement('button');
  tabTorob.className = 'dk-pc-tab active';
  tabTorob.innerText = getText("torob");
  tabTorob.onclick = () => switchTab('torob');
  
  const tabEsam = document.createElement('button');
  tabEsam.className = 'dk-pc-tab';
  tabEsam.innerText = getText("esam");
  tabEsam.onclick = () => switchTab('esam');
  
  tabs.appendChild(tabTorob);
  tabs.appendChild(tabEsam);
  
  const content = document.createElement('div');
  content.className = 'dk-pc-content';
  
  const contentTorob = document.createElement('div');
  contentTorob.id = 'dk-pc-content-torob';
  contentTorob.className = 'dk-pc-tab-content active';
  contentTorob.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
  
  const contentEsam = document.createElement('div');
  contentEsam.id = 'dk-pc-content-esam';
  contentEsam.className = 'dk-pc-tab-content';
  contentEsam.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
  
  content.appendChild(contentTorob);
  content.appendChild(contentEsam);
  
  modal.appendChild(header);
  modal.appendChild(tabs);
  modal.appendChild(content);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

function openModal() {
  overlay.classList.add('active');
  fetchData();
}

function closeModal() {
  overlay.classList.remove('active');
}

function switchTab(tabName) {
  document.querySelectorAll('.dk-pc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dk-pc-tab-content').forEach(c => c.classList.remove('active'));
  
  if (tabName === 'torob') {
    document.querySelectorAll('.dk-pc-tab')[0].classList.add('active');
    document.getElementById('dk-pc-content-torob').classList.add('active');
  } else {
    document.querySelectorAll('.dk-pc-tab')[1].classList.add('active');
    document.getElementById('dk-pc-content-esam').classList.add('active');
  }
}

function fetchData() {
  const torobContainer = document.getElementById('dk-pc-content-torob');
  const esamContainer = document.getElementById('dk-pc-content-esam');
  
  if (!torobContainer.querySelector('.dk-pc-item') && !esamContainer.querySelector('.dk-pc-item')) {
     torobContainer.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
     esamContainer.innerHTML = `<div class="dk-pc-loading">${getText("loading")}</div>`;
     
     const port = chrome.runtime.connect({name: "rightpick_stream"});
     
     port.onMessage.addListener((msg) => {
         if (msg.status === "progress") {
             const loadText = msg.message;
             const loaders = document.querySelectorAll('.dk-pc-loading');
             loaders.forEach(l => l.innerText = "⏳ " + loadText);
         } else if (msg.status === "complete") {
             const response = msg.data;
             if (response) {
                 renderTorob(response.torob, torobContainer);
                 renderEsam(response.esam, esamContainer);
             }
             port.disconnect();
         } else if (msg.status === "error") {
             torobContainer.innerText = "Error: " + msg.error;
             esamContainer.innerText = "Error: " + msg.error;
             port.disconnect();
         }
     });

     port.postMessage({
       action: "fetchPrices",
       query: productTitle
     });
  }
}

function renderTorob(data, container) {
  container.innerHTML = '';
  let items = Array.isArray(data) ? data : (data && data.results ? data.results : []);
  items = items.filter(item => item.price > 0);
  
  if (items.length === 0) {
    container.innerText = getText("noResult");
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('a');
    el.className = 'dk-pc-item';
    
    let href = '#';
    if (item.page_url) {
      href = item.page_url;
    } else if (item.random_key) {
      const slug = (item.name1 || item.title || '').replace(/\s+/g, '-');
      href = `https://torob.com/p/${item.random_key}/${slug}/`;
    }
    
    el.href = href;
    el.target = '_blank';
    
    const imgUrl = item.image_url || item.image || '';
    
    el.innerHTML = `
      <div class="dk-pc-item-info">
        <div class="dk-pc-item-title">${item.name1 || item.title || 'No Title'}</div>
        <div class="dk-pc-item-price">${item.price_text || item.price || ''}</div>
      </div>
      ${imgUrl ? `<img src="${imgUrl}" alt="">` : ''}
    `;
    container.appendChild(el);
  });
}

function renderEsam(data, container) {
  container.innerHTML = '';
  let items = [];
  if (Array.isArray(data)) items = data;
  else if (data && data.items) items = data.items;
  
  if (items.length === 0) {
    container.innerText = getText("noResult");
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('a');
    el.className = 'dk-pc-item';
    
    let href = '#';
    if (item.url) {
        href = item.url;
    } else {
        const id = item.itemId || item.id;
        const title = item.title || '';
        if (id) {
             href = `https://esam.ir/item/${id}/${encodeURIComponent(title)}`;
        }
    }
    
    el.href = href; 
    el.target = '_blank';
    
    const imgUrl = item.imageUrl || item.image || '';
    
    el.innerHTML = `
      <div class="dk-pc-item-info">
        <div class="dk-pc-item-title">${item.title || 'No Title'}</div>
        <div class="dk-pc-item-price">${item.price ? item.price.toLocaleString() + ' تومان' : ''}</div>
      </div>
      ${imgUrl ? `<img src="${imgUrl}" alt="">` : ''}
    `;
    container.appendChild(el);
  });
}

function getDigikalaPrice() {
  const buyBox = document.querySelector('div[class*="BuyBox"]'); 
  const targetBtn = findTargetButton();
  const container = buyBox || (targetBtn ? targetBtn.closest('div[class*="border"]') || targetBtn.parentElement.parentElement : document.body);
  
  if (!container) return Infinity;
  
  const elements = container.querySelectorAll('*');
  let minPrice = Infinity;
  
  elements.forEach(el => {
    if (el.children.length === 0 && el.innerText.includes('تومان')) {
       const p = parsePrice(el.innerText);
       if (p > 1000 && p < minPrice) { 
         minPrice = p;
       }
    }
  });
  
  if (minPrice === Infinity) {
      const text = container.innerText;
      const matches = text.match(/([۰-۹0-9,]+)\s*تومان/g);
      if (matches) {
          matches.forEach(m => {
              const p = parsePrice(m);
              if (p > 1000 && p < minPrice) minPrice = p;
          });
      }
  }
  
  return minPrice;
}
