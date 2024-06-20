document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = '../popup/popup.html';
});

document.getElementById('editButton').addEventListener('click', () => {
    editWebsite();
});

function editWebsite() {
    alert('Edit website functionality to be implemented');
}

document.querySelectorAll('.website-card').forEach(card => {
    card.addEventListener('click', (event) => {
        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('website-checkbox')) {
            if (card.classList.contains('selected')) {
                // If the card is already selected, deselect it
                card.classList.remove('selected');
            } else {
                // Deselect any currently selected card
                document.querySelectorAll('.website-card.selected').forEach(selectedCard => {
                    selectedCard.classList.remove('selected');
                });
                card.classList.add('selected');
            }
        }
    });
});

const style = document.createElement('style');
style.innerHTML = `
    .website-card.selected {
        border-color: var(--button-background-color);
        box-shadow: 0 0 10px var(--button-background-color);
    }
`;

document.head.appendChild(style);