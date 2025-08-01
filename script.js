// A Set to store the IDs of tips we've already processed.
const processedTipIds = new Set();
let projectId = null;
let isFirstLoad = true;

// Preload the cash register sound
const tipSound = new Audio('cash-register.mp3');
tipSound.volume = 0.5; // Set volume to a reasonable level

/**
 * Fetches the latest tip comments and triggers alerts for new ones.
 */
async function checkNewTips() {
    if (!projectId) {
        console.error("Project ID not available.");
        return;
    }

    try {
        // Fetch comments sorted by newest, filtering for tips only
        const response = await fetch(`/api/v1/projects/${projectId}/comments?only_tips=true`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const tips = data.comments.data;

        // On the very first check, we just populate the set with existing tips
        // so we don't trigger alerts for old ones.
        if (isFirstLoad) {
            tips.forEach(tipData => processedTipIds.add(tipData.comment.id));
            console.log(`Initialization complete. Watching for new tips.`);
            isFirstLoad = false;
            return;
        }

        // For subsequent checks, find tips that are not in our set.
        // We iterate in reverse to show the oldest new tip first.
        for (const tipData of tips.slice().reverse()) {
            const tipComment = tipData.comment;
            if (!processedTipIds.has(tipComment.id)) {
                // This is a new tip!
                console.log('New tip found:', tipComment);
                processedTipIds.add(tipComment.id);
                
                const tipAmount = tipComment.card_data.credits_spent;
                triggerTipAlert(tipAmount);
            }
        }

    } catch (error) {
        console.error("Failed to fetch tips:", error);
    }
}

/**
 * Creates and animates a visual alert for a tip.
 * @param {number} amount - The amount of the tip.
 */
function triggerTipAlert(amount) {
    // 1. Play the sound
    // We try to play the sound. It may be blocked by browser policy if there's no user interaction first.
    tipSound.currentTime = 0; // Rewind to start
    tipSound.play().catch(error => console.warn("Audio play failed. Browser may require user interaction first.", error));

    // 2. Create the visual element
    const alertContainer = document.getElementById('alert-container');
    const alertElement = document.createElement('div');
    alertElement.className = 'tip-alert';
    
    // Format number with commas and add the diamond symbol
    alertElement.textContent = `${amount.toLocaleString()}♦`;
    
    // 3. Add to the DOM to trigger the animation
    alertContainer.appendChild(alertElement);

    // 4. Clean up the element after the animation completes
    alertElement.addEventListener('animationend', () => {
        alertElement.remove();
    });
}

/**
 * Initializes the application.
 */
async function main() {
    try {
        const project = await window.websim.getCurrentProject();
        projectId = project.id;
        console.log(`Monitoring project: ${project.title} (${projectId})`);
        
        // Run the first check to establish a baseline of existing tips
        await checkNewTips();

        // Then, set up the polling to check for new tips every 15 seconds
        setInterval(checkNewTips, 15 * 1000);

    } catch (error) {
        console.error("Could not initialize tip alerter:", error);
        document.body.innerHTML = '<h1>Error</h1><p>Could not load project information. Please try refreshing the page.</p>';
    }
}

main();