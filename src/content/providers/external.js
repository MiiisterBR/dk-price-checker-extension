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
        // Check Title and URL as requested - use Torob's specific h1 location if available
        const titleEl = document.querySelector('[class*="Showcase_name"] h1') || 
                        document.querySelector('h1');
        const title = titleEl ? titleEl.innerText : '';
        const url = window.location.href;
        
        const currentFingerprint = title + '|' + url;

        if (currentFingerprint !== lastFingerprint) {
            lastFingerprint = currentFingerprint;
            
            // Clean up ALL old buttons and flags when page changes
            const oldButtons = document.querySelectorAll('.dk-reviews-btn');
            oldButtons.forEach(btn => btn.remove());
            
            // Reset all target button flags
            const allTargets = document.querySelectorAll('[data-dk-review-btn-added]');
            allTargets.forEach(target => delete target.dataset.dkReviewBtnAdded);
            
            // Wait briefly for DOM to settle then check/inject
            setTimeout(handleExternalSiteChanges, 500);
            setTimeout(handleExternalSiteChanges, 1500);
            setTimeout(handleExternalSiteChanges, 2500);
        } else {
            // Even if fingerprint is same, ensure button exists (backup)
            // But don't run full logic if not needed to save resources
            if (!document.querySelector('.dk-reviews-btn')) {
                 handleExternalSiteChanges();
            }
        }
    }, 3000); // Check every 3 seconds as requested

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

    // Try to find h1 in Torob's specific showcase container first, then fallback to generic h1
    let titleEl = document.querySelector('[class*="Showcase_name"] h1') || 
                  document.querySelector('h1');
    
    if (!titleEl) return;

    const currentTitle = titleEl.innerText.trim();

    // Check if button ALREADY exists for THIS product
    const existingBtn = document.querySelector('.dk-reviews-btn');
    if (existingBtn) {
        // CRITICAL FIX: Validate based on URL, not just title.
        // Title in DOM might lag behind in SPA, but URL is always fresh.
        const btnUrl = existingBtn.dataset.pageUrl;
        const currentUrl = window.location.href;
        
        // Fuzzy match URL (ignore query params or hash if needed, but exact match is safest for now)
        // We use 'includes' for path to be safe against tracking params
        const isSamePage = btnUrl && currentUrl.includes(btnUrl.split('?')[0]);

        if (isSamePage && existingBtn.dataset.productTitle === currentTitle) {
            return; // Already correctly injected for this exact page
        } else {
            // URL or Title mismatch! This is a stale button from previous page.
            existingBtn.remove();
            // Find and reset the target button that had the old button
            const allTargets = document.querySelectorAll('[data-dk-review-btn-added]');
            allTargets.forEach(t => delete t.dataset.dkReviewBtnAdded);
        }
    }

    // Find target button
    const targetBtn = findExternalTargetButton();
    if (!targetBtn) {
        return;
    }

    // If target already marked as processed, check if button actually exists
    if (targetBtn.dataset.dkReviewBtnAdded) {
        const nearbyBtn = document.querySelector('.dk-reviews-btn');
        if (nearbyBtn && nearbyBtn.dataset.productTitle === currentTitle) {
            return; // Already correctly processed
        }
        // Button missing or wrong, reset flag
        delete targetBtn.dataset.dkReviewBtnAdded;
    }

    // Inject new button
    createReviewsButton(targetBtn, currentTitle);
}

function findExternalTargetButton() {
    // Generic finder for Torob/Esam
    // Candidates: button, a, div[role=button], and generic .btn classes
    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], .btn, [class*="purchase-box"] button'));
    
    const found = candidates.find(b => {
        // Must be visible (basic check)
        if (b.offsetWidth === 0 && b.offsetHeight === 0) return false;
        
        // Additional visibility check
        const style = window.getComputedStyle(b);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

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
    
    // IMPORTANT: Re-read title from DOM to ensure we have the latest title
    // This is critical for SPA navigation where DOM might update after initial call
    const titleEl = document.querySelector('[class*="Showcase_name"] h1') || 
                     document.querySelector('h1');
    const currentProductTitle = titleEl ? titleEl.innerText.trim() : productTitle;
    
    // Mark target as processed
    targetBtn.dataset.dkReviewBtnAdded = 'true';

    const btn = document.createElement('div');
    btn.className = 'dk-reviews-btn';
    btn.innerText = "مشاهده نظرات دیجی‌کالا";
    btn.dataset.productTitle = currentProductTitle; // Store title for SPA validation
    btn.dataset.pageUrl = window.location.href; // Store URL for SPA validation (CRITICAL)
    
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
        
        let liveTitle = '';
        
        // Strategy 1: Extract from URL (Torob specific) - HIGHEST PRIORITY for SPA
        // The DOM h1 often lags behind in Torob's SPA, but URL is instant and accurate.
        if (window.location.hostname.includes('torob.com')) {
            try {
                const pathParts = window.location.pathname.split('/');
                // Usually the name is the last part or second to last if ends with slash
                let urlName = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
                if (urlName && urlName.length > 2 && !urlName.startsWith('p_')) {
                    urlName = decodeURIComponent(urlName).replace(/-/g, ' ');
                    liveTitle = urlName;
                }
            } catch (e) {
                // Silent catch
            }
        }
        
        // Strategy 2: Torob Showcase (only if URL failed)
        if (!liveTitle) {
            const s1 = document.querySelector('[class*="Showcase_name"] h1');
            if (s1) liveTitle = s1.innerText.trim();
        }
        
        // Strategy 3: Generic H1
        if (!liveTitle) {
            const s2 = document.querySelector('h1');
            if (s2) liveTitle = s2.innerText.trim();
        }

        // Strategy 4: Fallback to title attribute
        if (!liveTitle && document.title) {
             liveTitle = document.title.replace('| ترب', '').trim();
        }

        if (!liveTitle) {
            alert('خطا: عنوان محصول در صفحه پیدا نشد. لطفاً صفحه را رفرش کنید.');
            return;
        }
        
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
            query: liveTitle
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
