import { getText, getLanguage } from './localization.js';

export function showToast(source, price) {
    const toast = document.createElement('div');
    toast.className = 'dk-pc-toast';
    toast.innerHTML = `
        <div class="dk-pc-toast-title">${getText("toastTitle")}</div>
        <div class="dk-pc-toast-msg">
            ${getText("toastMsgPart1")} <strong>${price.toLocaleString(getLanguage() === 'fa' ? 'fa-IR' : 'en-US')} ${getText("toastMsgPart2")}</strong> ${getText("toastMsgPart3")} <strong>${source}</strong> ${getText("toastMsgPart4")}
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

export function showReviewsModal(reviews, product) {
    const existing = document.querySelector('.dk-reviews-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dk-reviews-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'dk-reviews-modal';
    
    // Header
    const header = document.createElement('div');
    header.className = 'dk-reviews-header';
    
    header.innerHTML = `
        <div class="dk-reviews-product-info">
            <img src="${product.image}" class="dk-reviews-product-img">
            <a href="${product.url}" target="_blank" class="dk-reviews-product-title">${product.title}</a>
        </div>
        <button class="dk-close-reviews">&times;</button>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'dk-reviews-content';
    
    if (!reviews || reviews.length === 0) {
        content.innerHTML = '<div class="dk-reviews-empty">نظری برای این محصول ثبت نشده است.</div>';
    } else {
        reviews.forEach(review => {
            const rDiv = document.createElement('div');
            rDiv.className = 'dk-review-item';
            
            const rate = review.rate || 0;
            const rateClass = rate >= 4 ? 'dk-rate-high' : (rate >= 2.5 ? 'dk-rate-mid' : 'dk-rate-low');
            
            rDiv.innerHTML = `
                <div class="dk-review-meta">
                    <span>${review.user_name || 'کاربر دیجی‌کالا'}</span>
                    <span>${review.created_at || ''}</span>
                </div>
                <div class="dk-review-body">
                    ${review.body || review.comment || ''}
                </div>
                ${rate > 0 ? `<div class="dk-review-rate ${rateClass}">★ ${rate}</div>` : ''}
            `;
            content.appendChild(rDiv);
        });
    }
    
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Events
    overlay.querySelector('.dk-close-reviews').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
}

export function showErrorModal(message) {
    const existing = document.querySelector('.dk-reviews-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dk-reviews-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'dk-reviews-modal';
    modal.style.maxWidth = '400px'; // Smaller for errors
    
    // Header
    const header = document.createElement('div');
    header.className = 'dk-reviews-header';
    header.innerHTML = `
        <div style="color:#f44336; font-weight:bold;">خطا</div>
        <button class="dk-close-reviews">&times;</button>
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'dk-reviews-content';
    content.innerHTML = `<div style="padding:20px; text-align:center; line-height:1.6;">${message}</div>`;
    
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.querySelector('.dk-close-reviews').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
}
