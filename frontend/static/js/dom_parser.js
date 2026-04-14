let currentTargetId = null; 
let misclickCount = 0; 
let shoppingList = JSON.parse(localStorage.getItem('mci_shopping_list') || '[]');
let lastPath = window.location.pathname; 
let extractionTimer = null;

function injectHelperUI() {
    if (document.getElementById('guidance-panel')) return;

    // 1. Create the main container panel (Now a bottom-right floating widget!)
    const panel = document.createElement('div');
    panel.id = 'guidance-panel';
    panel.style.cssText = "position: fixed; bottom: 20px; right: 20px; width: 350px; background-color: #e2f0d9; border: 4px solid #4caf50; border-radius: 12px; padding: 20px; z-index: 1001; font-size: 16px; font-weight: bold; box-sizing: border-box; transition: height 0.3s; box-shadow: 0px 4px 15px rgba(0,0,0,0.2);";

    // 2. Add the Guidance Text
    const textDiv = document.createElement('div');
    textDiv.id = 'guidance-text';
    textDiv.innerText = "Guide: I am here to help. What would you like to buy?";
    textDiv.style.marginTop = "15px"; // Push down slightly to clear the collapse button
    panel.appendChild(textDiv);

    // 3. Add the input box and buttons (Resized to fit the 350px widget)
    const goalContainer = document.createElement('div');
    goalContainer.id = 'goal-container';
    goalContainer.style.marginTop = "10px";

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'item-input';
    input.placeholder = "Type item...";
    input.style.cssText = "font-size: 14px; padding: 5px; width: 55%; margin-right: 2%; box-sizing: border-box;";
    goalContainer.appendChild(input);

    const addBtn = document.createElement('button');
    addBtn.innerText = "Add";
    addBtn.style.cssText = "font-size: 14px; padding: 5px; width: 18%; cursor: pointer; margin-right: 2%;";
    addBtn.addEventListener('click', addItem); 
    goalContainer.appendChild(addBtn);

    const clearBtn = document.createElement('button');
    clearBtn.innerText = "Clear";
    clearBtn.style.cssText = "font-size: 14px; padding: 5px; width: 20%; cursor: pointer;";
    clearBtn.addEventListener('click', clearList); 
    goalContainer.appendChild(clearBtn);

    const list = document.createElement('ul');
    list.id = 'visual-shopping-list';
    list.style.cssText = "margin-top: 10px; font-size: 16px; padding-left: 20px;";
    goalContainer.appendChild(list);

    panel.appendChild(goalContainer);
    
    // 4. Add the Single Collapsible Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerText = "➖ Collapse";
    toggleBtn.style.cssText = "position:absolute; top:5px; right:5px; cursor:pointer; font-size: 12px; padding: 2px 5px;";
    panel.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
        if (panel.style.height === "45px") {
            panel.style.height = "auto";
            panel.style.overflow = "visible";
            toggleBtn.innerText = "➖ Collapse";
        } else {
            panel.style.height = "45px";
            panel.style.overflow = "hidden";
            toggleBtn.innerText = "➕ Expand";
        }
    });

    document.body.appendChild(panel);
}

// Execute injection immediately
injectHelperUI();

function scheduleExtraction(isStruggling = false) {
    if (extractionTimer) clearTimeout(extractionTimer);
    
    extractionTimer = setTimeout(() => {
        updateVisualList();
        extractAndSendDOM(isStruggling);
    }, 1000);
}

setTimeout(() => {
    if (document.querySelector('.product-card') || document.querySelector('button')) { 
        updateVisualList(); 
        extractAndSendDOM(false); 
    }
}, 1000);

const observer = new MutationObserver((mutations) => { 
    if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        scheduleExtraction(false);
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
        if (guidanceEl) {
            guidanceEl.innerText = "Guide: Adding item..."; 
        }
        extractAndSendDOM(false); 
    } 
}

function clearList() { 
    shoppingList = []; 
    localStorage.removeItem('mci_shopping_list'); 
    updateVisualList(); 
    
    const guidanceEl = document.getElementById('guidance-text');
    if (guidanceEl) {
        guidanceEl.innerText = "Guide: List cleared. What would you like to buy?"; 
    }
    extractAndSendDOM(false); 
}

document.addEventListener('click', (e) => { 
    if (e.target.closest('#guidance-panel') || e.target.closest('#goal-container')) return;

    const clickedElement = e.target;
    const targetElement = currentTargetId ? document.getElementById(currentTargetId) : null;

    if (targetElement && (clickedElement === targetElement || targetElement.contains(clickedElement))) {
        misclickCount = 0; 
        currentTargetId = null; 

        document.querySelectorAll('.mci-highlight-focus, .mci-highlight-struggle').forEach(el => {
            el.classList.remove('mci-highlight-focus', 'mci-highlight-struggle'); 
        });

        scheduleExtraction(false);

    } else if (currentTargetId) {
        misclickCount++;
        if (misclickCount >= 3) {
            const guidanceEl = document.getElementById('guidance-text');
            if (guidanceEl) guidanceEl.innerText = "Guide: Recalculating simpler steps...";
            extractAndSendDOM(true); 
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
    if (guidanceEl) {
        guidanceEl.innerText = "Guide: Checkout complete! Well done."; 
    }
    
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
    .then(response => response.json())
    .then(data => {
        if ('speechSynthesis' in window && data.instruction) {
            const utterance = new SpeechSynthesisUtterance(data.instruction);
            utterance.onstart = () => console.log(`[${new Date().toISOString()}] Audio playback started`);
            window.speechSynthesis.speak(utterance);
        }
        
        const guidanceEl = document.getElementById('guidance-text');
        if (guidanceEl) {
            guidanceEl.innerText = "Guide: " + data.instruction;
        }

        currentTargetId = data.target_id;
        misclickCount = 0; 

        document.querySelectorAll('.mci-highlight-focus, .mci-highlight-struggle').forEach(el => {
            el.classList.remove('mci-highlight-focus', 'mci-highlight-struggle'); 
        });

        if (data.target_id) {
            let targetElement = document.getElementById(data.target_id);
            
            if (!targetElement && data.target_id.includes('mci-element-')) {
                targetElement = Array.from(document.querySelectorAll('button, a, input'))
                    .find(el => el.innerText && el.innerText.includes(data.target_id.replace('mci-element-', ''))); 
            }

            if (targetElement) {
                targetElement.classList.add('mci-highlight-focus');
                console.log(`[${new Date().toISOString()}] CSS masking applied to ${targetElement.id}`);
                if (isStruggling) targetElement.classList.add('mci-highlight-struggle');
            }
        }
    })
    .catch(error => {
        const guidanceEl = document.getElementById('guidance-text');
        if (guidanceEl) {
            guidanceEl.innerText = "Guide: Connection to helper lost.";
        }
    });
}