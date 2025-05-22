document.addEventListener('DOMContentLoaded', () => {
  const snapshotSelect = document.getElementById('snapshotSelect');
  const pathInput = document.getElementById('pathInput');
  const goBtn = document.getElementById('goBtn');
  const fileTable = document.getElementById('fileTable');
  const searchInput = document.getElementById('searchInput');

  let currentSnapshot = '';
  let currentPath = '';

  function fetchList() {
    if (!currentSnapshot) return;
    fetch(
      `/list?snapshot=${encodeURIComponent(currentSnapshot)}&path=${encodeURIComponent(currentPath)}`
    )
      .then(res => res.json())
      .then(data => renderTable(data));
  }

  function renderTable(items) {
    fileTable.innerHTML = '';
    items.forEach(item => {
      if (
        searchInput.value &&
        !item.name.toLowerCase().includes(searchInput.value.toLowerCase())
      ) {
        return;
      }
      const row = document.createElement('tr');

      // Name cell
      const nameCell = document.createElement('td');
      if (item.is_dir) {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = item.name + '/';
        link.addEventListener('click', e => {
          e.preventDefault();
          currentPath = currentPath
            ? `${currentPath}/${item.name}`
            : item.name;
          pathInput.value = currentPath;
          fetchList();
        });
        nameCell.appendChild(link);
      } else {
        nameCell.textContent = item.name;
      }

      // Size cell
      const sizeCell = document.createElement('td');
      sizeCell.textContent = item.is_dir ? '-' : item.size;

      // Modified cell
      const mtimeCell = document.createElement('td');
      mtimeCell.textContent = new Date(item.mtime * 1000).toLocaleString();

      // Action cell
      const actionCell = document.createElement('td');
      if (!item.is_dir) {
        const dl = document.createElement('a');
        dl.href =
          `/download?snapshot=${encodeURIComponent(currentSnapshot)}&path=${encodeURIComponent(
            currentPath ? `${currentPath}/${item.name}` : item.name
          )}`;
        dl.textContent = 'Download';
        dl.classList.add('btn', 'btn-sm', 'btn-primary');
        actionCell.appendChild(dl);
      }

      row.appendChild(nameCell);
      row.appendChild(sizeCell);
      row.appendChild(mtimeCell);
      row.appendChild(actionCell);
      fileTable.appendChild(row);
    });
  }

  // Event listeners
  snapshotSelect.addEventListener('change', () => {
    currentSnapshot = snapshotSelect.value;
    currentPath = '';
    pathInput.value = '';
    fetchList();
  });

  goBtn.addEventListener('click', () => {
    currentPath = pathInput.value.trim();
    fetchList();
  });

  searchInput.addEventListener('input', () => {
    // Simply hide rows that don't match
    const rows = fileTable.querySelectorAll('tr');
    rows.forEach(row => {
      const name = row.querySelector('td').textContent.toLowerCase();
      row.style.display = name.includes(searchInput.value.toLowerCase())
        ? '' : 'none';
    });
  });
});