let currentTargetId = null;
let misclickCount = 0;
// 1. Initialise the shopping list as an array
let shoppingList = JSON.parse(localStorage.getItem('mci_shopping_list') || '[]');

document.addEventListener('DOMContentLoaded', () => {
    updateVisualList();
    extractAndSendDOM(false);
});

// 2. Function to update the on-screen list
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

// 3. Function to add an item to the array
function addItem() {
    const input = document.getElementById('item-input');
    if (input && input.value.trim() !== '') {
        shoppingList.push(input.value.trim());
        localStorage.setItem('mci_shopping_list', JSON.stringify(shoppingList));
        input.value = ''; // Clear the box for the next item
        updateVisualList();
        document.getElementById('guidance-text').innerText = "Guide: Adding item...";
        extractAndSendDOM(false);
    }
}

function clearList() {
    shoppingList = [];
    localStorage.removeItem('mci_shopping_list');
    updateVisualList();
    document.getElementById('guidance-text').innerText = "Guide: List cleared. What would you like to buy?";
    extractAndSendDOM(false);
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#guidance-panel') || e.target.closest('#goal-container')) return;

    if (currentTargetId && e.target.id !== currentTargetId) {
        misclickCount++;
        if (misclickCount >= 3) {
            document.getElementById('guidance-text').innerText = "Guide: Recalculating simpler steps...";
            extractAndSendDOM(true); 
        }
    } else if (currentTargetId && e.target.id === currentTargetId) {
        misclickCount = 0;
    }
});

// NEW: Simulate a search routing based on user input
function performSearch(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('search-input');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Simulated routing logic
    if (searchVal.includes('milk')) {
        window.location.href = '/milk';
    } else {
        // Default to the apples page for anything else
        window.location.href = '/product'; 
    }
}

// NEW: Clear the hybrid state machine only upon successful task completion
function completeCheckout() {
    // 1. Wipe the external memory aids
    localStorage.removeItem('mci_shopping_list');
    localStorage.removeItem('mci_user_goal');
    
    // 2. Provide multimodal feedback of success
    document.getElementById('guidance-text').innerText = "Guide: Checkout complete! Well done.";
    
    // 3. Simulate the end of the journey and return home
    alert("Task Successful! Returning to home page.");
    window.location.href = '/';
}

function extractAndSendDOM(isStruggling = false) {
    const elements = Array.from(document.querySelectorAll('button, a, input')).map((el, index) => {
        if (!el.id) { el.id = 'mci-element-' + index; }
        let valueText = el.value ? ` (User has currently typed: '${el.value}')` : '';
        return {
            id: el.id,
            tag: el.tagName,
            text: (el.innerText || el.placeholder || '') + valueText,
            ariaLabel: el.getAttribute('aria-label') || ''
        };
    });

    fetch('/api/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            elements: elements, 
            is_struggling: isStruggling,
            shopping_list: shoppingList, // Send the full array
            current_path: window.location.pathname // Tell the backend what page we are on
        }) 
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('guidance-text').innerText = "Guide: " + data.instruction;
        currentTargetId = data.target_id;
        misclickCount = 0; 

        document.querySelectorAll('.mci-highlight-focus', '.mci-highlight-struggle').forEach(el => {
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
    .catch(err => console.error("Error fetching guidance:", err));
}
