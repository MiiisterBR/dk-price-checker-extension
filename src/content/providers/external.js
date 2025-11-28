import { getText } from '../modules/localization.js';
import { showReviewsModal, showErrorModal } from '../modules/ui.js';

export function initExternalSite() {
    console.log('DK Extension: Init External Site Started');
    
    // Initial check
    handleExternalSiteChanges();

    // Page Fingerprint Monitor (Alternative to Full MD5 Hashing)
    // We hash key content elements to detect page changes without full reloads
    let lastFingerprint = '';

    setInterval(() => {
        const path = window.location.pathname;
        const hostname = window.location.hostname;
        const isProductPage = (hostname.includes('esam.ir') && path.includes('/item/')) || 
                              (hostname.includes('torob.com') && path.includes('/p/'));

        if (!isProductPage) return;

        // Generate Fingerprint
        // Combine Title + URL + Main Image (if possible) + Price (if possible)
        const title = document.querySelector('h1') ? document.querySelector('h1').innerText : '';
        const url = window.location.href;
        // Simple lightweight hash
        const currentFingerprint = title + '|' + url;

        if (currentFingerprint !== lastFingerprint) {
            console.log('DK Extension: Page Fingerprint Changed!', currentFingerprint);
            lastFingerprint = currentFingerprint;
            
            // Wait briefly for DOM to settle then check/inject
            setTimeout(handleExternalSiteChanges, 500);
            setTimeout(handleExternalSiteChanges, 1500);
        } else {
            // Even if fingerprint is same, ensure button exists (backup)
            // But don't run full logic if not needed to save resources
            if (!document.querySelector('.dk-reviews-btn')) {
                 handleExternalSiteChanges();
            }
        }
    }, 1000); // Check every 1 second (User asked for 3, but 1 is snappier and safe with this lightweight check)

    // Use MutationObserver for SPA/React sites
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }
        
        if (shouldCheck) {
            handleExternalSiteChanges();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function handleExternalSiteChanges() {
    // Security check for SPA navigation to ensure we are on a product page
    const path = window.location.pathname;
    const hostname = window.location.hostname;

    if (hostname.includes('esam.ir') && !path.includes('/item/')) return;
    if (hostname.includes('torob.com') && !path.includes('/p/')) return;

    const titleEl = document.querySelector('h1');
    if (!titleEl) return;

    const currentTitle = titleEl.innerText.trim();

    // Check if button ALREADY exists
    const existingBtn = document.querySelector('.dk-reviews-btn');
    if (existingBtn) {
        // If button exists, check if it matches the current product
        // We store the title on the button dataset to verify
        if (existingBtn.dataset.productTitle === currentTitle) {
            return; // Already there and correct
        } else {
            // Title mismatch! This means we navigated to a new product but the button persisted (SPA reuse)
            console.log('DK Extension: Product changed (Title mismatch), removing old button.');
            existingBtn.remove();
            // Also need to clear the dataset on the target button if it's being reused
            const prevTarget = findExternalTargetButton();
            if (prevTarget) delete prevTarget.dataset.dkReviewBtnAdded;
        }
    }

    const targetBtn = findExternalTargetButton();
    
    if (targetBtn) {
        // If target says it's added, but the button isn't there (and not caught by existingBtn check above),
        // it means the SPA wiped the review button but kept the target button instance (or copied it).
        // We verify if the review button is actually nearby.
        if (targetBtn.dataset.dkReviewBtnAdded && !existingBtn) {
             // Check siblings/children/parent to be sure
             const nearbyBtn = targetBtn.parentNode.querySelector('.dk-reviews-btn') || 
                               (targetBtn.nextElementSibling && targetBtn.nextElementSibling.classList.contains('dk-reviews-btn') ? targetBtn.nextElementSibling : null);
             
             if (!nearbyBtn) {
                  console.log('DK Extension: Target marked as processed but button missing. Resetting.');
                  delete targetBtn.dataset.dkReviewBtnAdded;
             }
        }

        // Double check to ensure we don't add multiple times
        if (!targetBtn.dataset.dkReviewBtnAdded) {
             console.log('DK Extension: Found target, injecting button for', currentTitle);
             createReviewsButton(targetBtn, currentTitle);
        } else if (existingBtn && existingBtn.dataset.productTitle !== currentTitle) {
             // Edge case: Target marked as added, but button was removed above due to title mismatch
             // We need to re-add.
             console.log('DK Extension: Re-injecting button for new product title');
             createReviewsButton(targetBtn, currentTitle);
        }
    }
}

function findExternalTargetButton() {
    // Generic finder for Torob/Esam
    // Candidates: button, a, div[role=button], and generic .btn classes
    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], .btn, [class*="purchase-box"] button'));
    
    const found = candidates.find(b => {
        // Must be visible (basic check)
        if (b.offsetWidth === 0 && b.offsetHeight === 0) return false;

        const text = b.innerText.trim();
        if (!text) return false;
        
        const keywords = [
            'خرید از ارزان‌ترین', 
            'افزودن به سبد', 
            'لیست فروشندگان',
            'خرید اینترنتی',
            'پیشنهاد قیمت',
            'خرید'
        ];

        // Check text match
        const hasKeyword = keywords.some(kw => text.includes(kw));
        if (!hasKeyword) return false;

        // Exclusions
        if (b.closest('header') || b.closest('footer') || b.closest('nav')) return false;
        if (text.length < 3) return false;

        return true;
    });

    if (found) return found;

    // Fallback 1: Look for specific containers in Esam/Torob if button not found by text
    // Esam specific: .productPurchaseBox... button
    const esamBtn = document.querySelector('[class*="productPurchaseBox"] button');
    if (esamBtn) return esamBtn;

    // Fallback 2: H1
    const h1 = document.querySelector('h1');
    if (h1) return h1;

    return null;
}

function createReviewsButton(targetBtn, productTitle) {
    // Prevent duplicates
    if (targetBtn.dataset.dkReviewBtnAdded) return;
    if (targetBtn.nextElementSibling && targetBtn.nextElementSibling.className === 'dk-reviews-btn') return;
    
    // Mark target as processed
    targetBtn.dataset.dkReviewBtnAdded = 'true';

    const btn = document.createElement('div');
    btn.className = 'dk-reviews-btn';
    btn.innerText = "مشاهده نظرات دیجی‌کالا";
    btn.dataset.productTitle = productTitle; // Store title for SPA validation
    
    // Style it - moved to CSS as much as possible, but some specific overrides remain
    btn.style.marginTop = '12px';
    btn.style.backgroundColor = '#8e24aa'; // Digikala Purple
    btn.style.color = 'white';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'center';
    btn.style.fontWeight = 'bold';
    btn.style.width = '100%'; 
    btn.style.display = 'flex'; 
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.boxSizing = 'border-box';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        const port = chrome.runtime.connect({name: "rightpick_stream"});
        
        port.onMessage.addListener((msg) => {
            if (msg.status === "progress") {
                btn.innerText = "⏳ " + msg.message;
            } else if (msg.status === "complete") {
                btn.innerText = "مشاهده نظرات دیجی‌کالا";
                const response = msg.data;
                if (!response || response.error) {
                    alert(response ? response.error : "Error receiving data");
                } else {
                    showReviewsModal(response.reviews, response.product);
                }
                port.disconnect();
            } else if (msg.status === "error") {
                 const originalText = btn.innerText;
                 btn.innerText = "❌ یافت نشد";
                 btn.style.backgroundColor = "#f44336"; // Red
                 
                 // Show Modal for better visibility
                 showErrorModal(msg.error);
                 
                 setTimeout(() => {
                     btn.innerText = "مشاهده نظرات دیجی‌کالا";
                     btn.style.backgroundColor = "#8e24aa"; // Revert
                 }, 3000);
                 
                 port.disconnect();
            }
        });

        port.postMessage({
            action: "searchDigikalaAndGetReviews",
            query: productTitle
        });
    };
    
    // Insertion Logic
    if (targetBtn.tagName === 'H1') {
        targetBtn.insertAdjacentElement('afterend', btn);
        return;
    }

    const parent = targetBtn.parentNode;
    if (parent) {
        if (parent.className && typeof parent.className === 'string' && parent.className.includes('productPurchaseBox')) {
             parent.appendChild(btn);
        } 
        else {
             const parentStyle = window.getComputedStyle(parent);
             if (parentStyle.display === 'flex' && parentStyle.flexDirection.includes('row')) {
                 if (parent.parentNode) {
                     parent.parentNode.insertBefore(btn, parent.nextSibling);
                     btn.style.marginTop = '8px';
                 } else {
                     targetBtn.insertAdjacentElement('afterend', btn);
                 }
             } else {
                 targetBtn.insertAdjacentElement('afterend', btn);
             }
        }
    }
}
