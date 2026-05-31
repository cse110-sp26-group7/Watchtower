// Search bar functionality for error log page
document.getElementById("search").addEventListener("input", function() {
    const query = this.value.toLowerCase();

    const rows = document.querySelectorAll(".full-errors-table tbody tr");
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const match = text.includes(query);

        row.style.display = match ? '' : 'none';

        const detailRow = row.nextElementSibling;
        if (detailRow?.classList.contains('detail-row')) {
            detailRow.style.display = 'none';
        }
    });
});

// Filter functionality for error log page
document.getElementById("filter").addEventListener("change", function() {
    const filter = this.value;

    const rows = document.querySelectorAll(".full-errors-table tbody tr");
    
    rows.forEach(row => {
        const level = row.textContent.toLowerCase() || '';
        let show = false;

        if (filter === "all") {
            show = true;
        } else if (filter === "error" && level.includes("error")) {
            show = true;
        } else if (filter === "warning" && level.includes("warning")) {
            show = true;
        } else if (filter === "minimal" && level.includes("minimal")) {
            show = true;
        }

        row.style.display = show ? '' : 'none';
        
        const detailRow = row.nextElementSibling;
        if (detailRow?.classList.contains('detail-row')) {
            detailRow.style.display = 'none';
        }
    });
});