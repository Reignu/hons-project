let currentTargetId = null; 
let misclickCount = 0; 
let shoppingList = JSON.parse(localStorage.getItem('mci_shopping_list') || '[]');

const observer = new MutationObserver((mutations, obs) => { 
    if (document.querySelector('.product-card') || document.querySelector('button')) { 
        updateVisualList(); 
        extractAndSendDOM(false); 
        obs.disconnect(); 
    } 
}); 
observer.observe(document.body, { childList: true, subtree: true });

function updateVisualList() { 
    const ul = document.getElementById('visual-shopping-list'); 
    if (!ul) return; 
    ul.innerHTML = ''; 
    if (shoppingList.length === 0) { 
        ul.innerHTML = '<li><em>List is empty.</em></li>'; 
    } else { 
        shoppingList.forEach(item => { 
            const li = document.createElement('li'); 
            li.innerText = item; 
            ul.appendChild(li); 
        }); 
    } 
}

function addItem() { 
    const input = document.getElementById('item-input'); 
    if (input && input.value.trim() !== '') { 
        shoppingList.push(input.value.trim()); 
        localStorage.setItem('mci_shopping_list', JSON.stringify(shoppingList)); 
        input.value = ''; 
        updateVisualList(); 
        
        const guidanceEl = document.getElementById('guidance-text');
        if (guidanceEl) guidanceEl.innerText = "Guide: Adding item..."; 
        
        extractAndSendDOM(false); 
    } 
}

function clearList() { 
    shoppingList = []; 
    localStorage.removeItem('mci_shopping_list'); 
    updateVisualList(); 
    
    const guidanceEl = document.getElementById('guidance-text');
    if (guidanceEl) guidanceEl.innerText = "Guide: List cleared. What would you like to buy?"; 
    
    extractAndSendDOM(false); 
}

document.addEventListener('click', (e) => { 
    // Ignore clicks on the helper UI itself
    if (e.target.closest('#guidance-panel') || e.target.closest('#goal-container')) return;
    
    // Misclick tracking logic
    if (currentTargetId) {
        if (e.target.id === currentTargetId) {
            // Correct click: reset counter
            misclickCount = 0;
        } else {
            // Wrong click: increment and check threshold
            misclickCount++;
            if (misclickCount >= 3) {
                const guidanceEl = document.getElementById('guidance-text');
                if (guidanceEl) guidanceEl.innerText = "Guide: Recalculating simpler steps...";
                extractAndSendDOM(true); 
            }
        }
    }
});

function performSearch(event) { 
    if (event) event.preventDefault(); 
    const searchInput = document.getElementById('search-input'); 
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (searchVal.includes('milk')) {
        window.location.href = '/milk';
    } else {
        window.location.href = '/product'; 
    }
}

function completeCheckout() { 
    localStorage.removeItem('mci_shopping_list'); 
    localStorage.removeItem('mci_user_goal'); 
    
    const guidanceEl = document.getElementById('guidance-text');
    if (guidanceEl) guidanceEl.innerText = "Guide: Checkout complete! Well done."; 
    
    alert("Task Successful! Returning to home page."); 
    window.location.href = '/'; 
}

function extractAndSendDOM(isStruggling = false) { 
    const elements = Array.from(document.querySelectorAll('button, a, input')).map((el, index) => { 
        if (!el.id) { 
            el.id = 'mci-element-' + index; 
        } 
        let valueText = el.value ? ` (User has currently typed: '${el.value}')` : ''; 
        return { 
            id: el.id, 
            tag: el.tagName, 
            text: (el.innerText || el.placeholder || '') + valueText, 
            ariaLabel: el.getAttribute('aria-label') || '' 
        }; 
    });

    fetch('http://127.0.0.1:5000/api/guide', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            elements: elements,
            is_struggling: isStruggling,
            shopping_list: shoppingList,
            current_path: window.location.pathname
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        console.log("LLM Command Received:", data);
        
        const guidanceEl = document.getElementById('guidance-text');
        if (guidanceEl) {
            guidanceEl.innerText = "Guide: " + (data.instruction || "Ready.");
        }

        currentTargetId = data.target_id;
        misclickCount = 0; 

        // Corrected selector string
        document.querySelectorAll('.mci-highlight-focus, .mci-highlight-struggle').forEach(el => {
            el.classList.remove('mci-highlight-focus', 'mci-highlight-struggle'); 
        });

        if (data.target_id) {
            const targetElement = document.getElementById(data.target_id);
            if (targetElement) {
                targetElement.classList.add('mci-highlight-focus');
                if (isStruggling) targetElement.classList.add('mci-highlight-struggle');
            }
        }
    })
    .catch(error => {
        console.error('Error reaching Flask backend:', error);
        const guidanceEl = document.getElementById('guidance-text');
        if (guidanceEl) {
            guidanceEl.innerText = "Guide: Connection to helper lost.";
        }
    });
}