import { getApiKey, aiSelectProduct, generateSimplifiedQuery } from '../services/openaiService.js';

export async function handleDigikalaReviews(port, query) {
    try {
        port.postMessage({ status: "progress", message: "جستجو در دیجی‌کالا..." });

        // 1. Search Digikala (Initial)
        const apiKey = await getApiKey();
        let productId = null;
        let selectedProduct = null;
        
        let searchRes = await searchDigikala(query);
        let products = searchRes.data?.products || [];
        
        // Helper to process selection
        const processSelection = async (candidateProducts) => {
            if (!apiKey) return candidateProducts[0]?.id; // Fallback
            
            port.postMessage({ status: "progress", message: "بررسی هوشمند محتوا توسط هوش مصنوعی..." });
            return await aiSelectProduct(apiKey, query, candidateProducts.slice(0, 10));
        };

        if (products.length > 0) {
             productId = await processSelection(products);
        }
        
        // Retry Logic
        if (!productId) {
             port.postMessage({ status: "progress", message: "تلاش مجدد..." });
             
             let simplifiedName = null;
             if (apiKey) {
                 simplifiedName = await generateSimplifiedQuery(apiKey, query);
             } else {
                 // Heuristic simplification for non-AI users
                 // 1. Remove parentheses and their content
                 let s = query.replace(/\([^)]*\)/g, '').replace(/[\[\{].*?[\]\}]/g, '');
                 // 2. Remove "مدل" and following common stopwords if needed, or just keep first N words
                 // Better: Split by space, take first 4-5 words which usually contain Brand + Model
                 const words = s.trim().split(/\s+/);
                 if (words.length > 4) {
                     simplifiedName = words.slice(0, 4).join(' ');
                 } else if (s !== query) {
                     simplifiedName = s.trim();
                 }
             }
             
             if (simplifiedName && simplifiedName !== query) {
                 console.log("Retrying Digikala search with:", simplifiedName);
                 searchRes = await searchDigikala(simplifiedName);
                 products = searchRes.data?.products || [];
                 
                 if (products.length > 0) {
                     productId = await processSelection(products);
                 }
             }
        }

        if (!productId) {
            if (apiKey) {
                port.postMessage({ status: "error", error: "این محصول در دیجی‌کالا یافت نشد." });
            } else {
                 port.postMessage({ status: "error", error: "محصولی یافت نشد." });
            }
            return;
        }

        selectedProduct = products.find(p => p.id == productId);
        // Safety check if ID returned but product object missing from last list
        if (!selectedProduct) {
             // In case of retry, we might need to fetch product details or just fail gracefully if not in list
             // But usually it comes from the list we just searched
             port.postMessage({ status: "error", error: "خطا در بازیابی اطلاعات محصول." });
             return;
        }

        // 2. Get Reviews
        port.postMessage({ status: "progress", message: "دریافت نظرات..." });
        const reviewsUrl = `https://api.digikala.com/v1/rate-review/products/${productId}/?page=1`;
        const reviewsRes = await fetch(reviewsUrl);
        const reviewsJson = await reviewsRes.json();

        const result = {
            product: {
                id: productId,
                title: selectedProduct.title_fa || selectedProduct.title,
                image: selectedProduct.images && selectedProduct.images.main ? selectedProduct.images.main.url : null,
                url: `https://www.digikala.com/product/dkp-${productId}/`
            },
            reviews: reviewsJson.data ? (reviewsJson.data.items || reviewsJson.data.comments || []) : []
        };

        port.postMessage({ status: "complete", data: result });

    } catch (error) {
        console.error("Digikala API Error:", error);
        port.postMessage({ status: "error", error: error.message });
    }
}

async function searchDigikala(query) {
    const searchUrl = `https://api.digikala.com/v1/search/?page=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl);
    return await res.json();
}
