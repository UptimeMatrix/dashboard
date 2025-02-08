let jsonData;
let pendingAction = null;
let currentCategory = null;
let editingMaintenanceIndex = null;
let editingStatusUpdateIndex = null;
let notificationTimeout;
let firstTimeStep = 0;
console.log("Developed by Layeredy Software (lyrdy.co) | Open source on github.com/uptimematrix/dashboard");

function sanitizeId(name) {
    return name.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
}

function copyApiUrl() {
    const apiUrl = `${window.location.origin}/data`;
    navigator.clipboard.writeText(apiUrl).then(function() {
        showNotification('API URL copied to clipboard');
    }, function(err) {
        console.error('Could not copy text: ', err);
    });
}

function loadJSON() {
    showLoading();
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            jsonData = data;
            if (!Array.isArray(jsonData.services)) {
                console.log('Converting services format'); 
                jsonData.services = convertServicesToNewFormat(jsonData.services);
            }
            document.getElementById('jsonEditor').value = JSON.stringify(jsonData, null, 2);
            renderServiceList();
            renderMaintenanceAlerts();
            renderStatusUpdates();
            updateToggleStatuses();

            if (jsonData.announcement && jsonData.announcement.text) {
                document.getElementById('announcementText').value = jsonData.announcement.text;
            } else {
                document.getElementById('announcementText').value = '';
            }

            hideLoading();
            document.getElementById('main-content').style.display = 'block';
        })
        .catch(error => {
            console.error('Error details:', error); 
            hideLoading();
            showNotification('Error loading data.');
        });
}

function convertServicesToNewFormat(servicesObj) {
    const servicesArray = [];
    for (const [categoryName, services] of Object.entries(servicesObj)) {
        const servicesList = [];
        for (const [serviceName, status] of Object.entries(services)) {
            servicesList.push({ serviceName, status });
        }
        servicesArray.push({ categoryName, services: servicesList });
    }
    return servicesArray;
}

function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

function resetJSON() {
    if (isJSONEmpty(jsonData)) {
        fetchDefaultJSON();
    } else {
        showWarningModal();
    }
}

function isJSONEmpty(jsonObj) {
    return Object.keys(jsonObj).length === 0 && jsonObj.constructor === Object;
}

function fetchDefaultJSON() {
    fetch('https://raw.githubusercontent.com/uptimematrix/json/refs/heads/main/statuspage.json')
        .then(response => response.json())
        .then(defaultData => {
            if (!Array.isArray(defaultData.services)) {
                defaultData.services = convertServicesToNewFormat(defaultData.services);
            }
            jsonData = defaultData;
            document.getElementById('jsonEditor').value = JSON.stringify(defaultData, null, 2);
            updateJSON();
            renderServiceList();
            renderMaintenanceAlerts();
            renderStatusUpdates();
            updateToggleStatuses();
            showNotification('Status page reset to default.');
        })
        .catch(error => {
            showNotification('Error fetching default configuration.');
        });
}

function showWarningModal() {
    document.getElementById('warningModal').style.display = 'block';
}

function closeWarningModal() {
    document.getElementById('warningModal').style.display = 'none';
}

function performReset() {
    closeWarningModal();
    fetchDefaultJSON();
}

function showFirstTimeModal() {
    firstTimeStep = 0;
    updateFirstTimeContent();
    document.getElementById('firstTimeModal').style.display = 'block';
}

function closeFirstTimeModal() {
    document.getElementById('firstTimeModal').style.display = 'none';
}

function updateFirstTimeContent() {
    const contentDiv = document.getElementById('firstTimeContent');
    contentDiv.innerHTML = '';

    if (firstTimeStep === 0) {
        const title = document.createElement('h2');
        title.textContent = 'Welcome to UptimeMatrix';

        const message = document.createElement('p');
        message.textContent = "Let's get you started, keep in mind that UptimeMatrix is still in development and you will most likely find bugs, report issues to us via emailing us at contact@layeredy.com.";

        const nextButton = document.createElement('button');
        nextButton.className = 'btn save-btn';
        nextButton.textContent = 'Next Step';
        nextButton.onclick = () => {
            firstTimeStep++;
            updateFirstTimeContent();
        };

        contentDiv.appendChild(title);
        contentDiv.appendChild(message);
        contentDiv.appendChild(nextButton);
    } else if (firstTimeStep === 1) {
        const message = document.createElement('p');
        message.innerHTML = `
          First, you'll need to select one of our themes, check out 
          <a href="https://github.com/layeredy/uptimematrix-statuspage-spark" target="_blank">Spark</a> and 
          <a href="https://github.com/layeredy/uptimematrix-statuspage-pulse" target="_blank">Pulse</a>.
          <div class="row mt-3">
            <div class="col-md-6 text-center">
              <a href="https://layeredy.github.io/uptimematrix-statuspage-spark/" target="_blank">
                <img src="https://layeredy.com/uptimematrix/images/spark.png" alt="Spark Theme" style="max-width: 100%; height: auto;">
                <p>Spark theme</p>
              </a>
            </div>
            <div class="col-md-6 text-center">
              <a href="https://layeredy.github.io/uptimematrix-statuspage-pulse/" target="_blank">
                <img src="https://layeredy.com/uptimematrix/images/pulse.png" alt="Pulse Theme" style="max-width: 100%; height: auto;">
                <p>Pulse theme</p>
              </a>
            </div>
          </div>
          <p class="text-muted text-center mt-3">
            <i class="bi bi-info-circle"></i> You can click a theme to view a live demo
          </p>
        `;

        const nextButton = document.createElement('button');
        nextButton.className = 'btn save-btn';
        nextButton.textContent = 'Next Step';
        nextButton.onclick = () => {
            firstTimeStep++;
            updateFirstTimeContent();
        };

        contentDiv.appendChild(message);
        contentDiv.appendChild(nextButton);
    } else if (firstTimeStep === 2) {
        const message = document.createElement('p');
        message.textContent = 'Next, you\'ll need to download your chosen theme and upload it to your webserver. You can use cPanel, Plesk, DirectAdmin, plain NGINX or Apache, anything.';

        const nextButton = document.createElement('button');
        nextButton.className = 'btn save-btn';
        nextButton.textContent = 'Next Step';
        nextButton.onclick = () => {
            firstTimeStep++;
            updateFirstTimeContent();
        };

        contentDiv.appendChild(message);
        contentDiv.appendChild(nextButton);
    } else if (firstTimeStep === 3) {
        const message = document.createElement('p');
        message.innerHTML = 'Finally, you will need to set your API URL in the script.js file. If you need more help doing this, check out our <a href="https://github.com/uptimematrix/docs/wiki/Changing-your-API-URL" target="_blank">documentation</a>.';

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'modal-buttons';

        const closeButton = document.createElement('button');
        closeButton.className = 'btn cancel-btn';
        closeButton.textContent = 'Close';
        closeButton.onclick = () => {
            closeFirstTimeModal();
        };

        const grabDefaultButton = document.createElement('button');
        grabDefaultButton.className = 'btn save-btn';
        grabDefaultButton.textContent = 'Grab default status-page info';
        grabDefaultButton.onclick = () => {
            if (isJSONEmpty(jsonData)) {
                fetchDefaultJSON();
                closeFirstTimeModal();
            } else {
                closeFirstTimeModal();
                showWarningModal();
            }
        };

        buttonsDiv.appendChild(closeButton);
        buttonsDiv.appendChild(grabDefaultButton);

        contentDiv.appendChild(message);
        contentDiv.appendChild(buttonsDiv);
    }
}

function renderMaintenanceAlerts() {
    const maintenanceContent = document.getElementById('maintenanceAlertsContent');
    if (!jsonData.sections.maintenanceAlerts) {
        maintenanceContent.style.display = 'none';
    } else {
        maintenanceContent.style.display = 'block';
        const maintenanceList = document.getElementById('maintenanceAlertsList');
        maintenanceList.innerHTML = '';

        jsonData.maintenanceAlerts.forEach((alert, index) => {
            const alertItem = document.createElement('li');
            alertItem.className = 'alert-item';

            const title = document.createElement('h3');
            title.textContent = alert.title;

            const message = document.createElement('p');
            message.textContent = alert.message;

            const start = document.createElement('p');
            start.innerHTML = `<strong>Start:</strong> ${new Date(alert.start).toLocaleString()}`;

            const end = document.createElement('p');
            end.innerHTML = `<strong>End:</strong> ${new Date(alert.end).toLocaleString()}`;

            const actions = document.createElement('div');
            actions.className = 'alert-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn';
            editBtn.innerHTML = '<i class="bi bi-pencil"></i> Edit';
            editBtn.onclick = () => showEditMaintenanceModal(index);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
            deleteBtn.onclick = () => deleteMaintenanceAlert(index);

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            alertItem.appendChild(actions);
            alertItem.appendChild(title);
            alertItem.appendChild(message);
            alertItem.appendChild(start);
            alertItem.appendChild(end);

            maintenanceList.appendChild(alertItem);
        });
    }
}

function renderStatusUpdates() {
    const statusUpdatesContent = document.getElementById('statusUpdatesContent');
    if (!jsonData.sections.statusUpdates) {
        statusUpdatesContent.style.display = 'none';
    } else {
        statusUpdatesContent.style.display = 'block';
        const statusUpdatesList = document.getElementById('statusUpdatesList');
        statusUpdatesList.innerHTML = '';

        jsonData.statusUpdates.forEach((update, index) => {
            const updateItem = document.createElement('li');
            updateItem.className = 'alert-item';

            const title = document.createElement('h3');
            title.textContent = update.title;

            const message = document.createElement('p');
            message.textContent = update.message;

            const date = document.createElement('p');
            date.innerHTML = `<strong>Date:</strong> ${new Date(update.date).toLocaleString()}`;

            const color = document.createElement('p');
            color.innerHTML = `<strong>Color:</strong> <span style="color:${update.color}">${update.color}</span>`;

            const actions = document.createElement('div');
            actions.className = 'alert-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn';
            editBtn.innerHTML = '<i class="bi bi-pencil"></i> Edit';
            editBtn.onclick = () => showEditStatusUpdateModal(index);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';
            deleteBtn.onclick = () => deleteStatusUpdate(index);

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            updateItem.appendChild(actions);
            updateItem.appendChild(title);
            updateItem.appendChild(message);
            updateItem.appendChild(date);
            updateItem.appendChild(color);

            statusUpdatesList.appendChild(updateItem);
        });
    }
}

function renderServiceList() {
    const serviceList = document.getElementById('serviceList');
    serviceList.innerHTML = '';

    jsonData.services.forEach((categoryObj, categoryIndex) => {
        const category = categoryObj.categoryName;
        const services = categoryObj.services;

        const categoryItem = document.createElement('li');
        categoryItem.className = 'category-item';

        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-name';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'category-header-left';
        headerLeft.style.display = 'flex';
        headerLeft.style.alignItems = 'center';

        const dragIcon = document.createElement('i');
        dragIcon.className = 'bi bi-grip-vertical';
        dragIcon.style.cursor = 'grab';
        dragIcon.style.marginRight = '10px';

        const categoryName = document.createElement('span');
        categoryName.textContent = category;

        headerLeft.appendChild(dragIcon);
        headerLeft.appendChild(categoryName);

        const addServiceBtn = document.createElement('button');
        addServiceBtn.className = 'btn';
        addServiceBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Service';
        addServiceBtn.onclick = () => showAddServiceModal(category);

        const deleteCategoryBtn = document.createElement('button');
        deleteCategoryBtn.className = 'delete-category-btn';
        deleteCategoryBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
        deleteCategoryBtn.onclick = () => deleteCategory(category);

        const categoryButtons = document.createElement('div');
        categoryButtons.className = 'category-buttons';
        categoryButtons.appendChild(addServiceBtn);
        categoryButtons.appendChild(deleteCategoryBtn);

        categoryHeader.appendChild(headerLeft);
        categoryHeader.appendChild(categoryButtons);

        categoryItem.appendChild(categoryHeader);

        const serviceItems = document.createElement('ul');
        serviceItems.className = 'service-list';

        const sanitizedCategoryId = sanitizeId(category);
        serviceItems.id = `serviceItems-${sanitizedCategoryId}`;

        services.forEach((serviceObj, serviceIndex) => {
            const service = serviceObj.serviceName;
            const status = serviceObj.status;

            const serviceItem = document.createElement('li');
            serviceItem.className = 'service-item';

            const serviceNameContainer = document.createElement('div');
            serviceNameContainer.className = 'service-name-container';

            const serviceDragIcon = document.createElement('i');
            serviceDragIcon.className = 'bi bi-grip-vertical';
            serviceDragIcon.style.cursor = 'grab';
            serviceDragIcon.style.marginRight = '10px';

            const serviceName = document.createElement('span');
            serviceName.className = 'service-name';
            serviceName.textContent = service;

            const deleteServiceBtn = document.createElement('button');
            deleteServiceBtn.className = 'delete-service-btn';
            deleteServiceBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
            deleteServiceBtn.onclick = () => deleteService(category, service);

            serviceNameContainer.appendChild(serviceDragIcon);
            serviceNameContainer.appendChild(serviceName);
            serviceNameContainer.appendChild(deleteServiceBtn);

            const statusDropdown = document.createElement('select');
            statusDropdown.className = 'status-dropdown';
            statusDropdown.onchange = function() {
                updateStatus(category, service, this.value);
            };

            const statuses = ['Operational', 'Degraded', 'Issue', 'Slow', 'Maintenance'];
            statuses.forEach(s => {
                const option = document.createElement('option');
                option.value = s;
                option.textContent = s;
                if (status === s) {
                    option.selected = true;
                }
                statusDropdown.appendChild(option);
            });

            serviceItem.appendChild(serviceNameContainer);
            serviceItem.appendChild(statusDropdown);

            serviceItems.appendChild(serviceItem);
        });

        categoryItem.appendChild(serviceItems);

        serviceList.appendChild(categoryItem);

        new Sortable(serviceItems, {
            group: 'services',
            animation: 150,
            handle: '.service-name-container',
            draggable: '.service-item',
            onEnd: function (evt) {
                const servicesOrder = Array.from(serviceItems.children).map(child => {
                    return child.querySelector('.service-name').textContent;
                });
                const updatedServices = [];
                servicesOrder.forEach(serviceName => {
                    const serviceObj = services.find(s => s.serviceName === serviceName);
                    if (serviceObj) {
                        updatedServices.push(serviceObj);
                    }
                });
                categoryObj.services = updatedServices;
                updateJSON();
            }
        });
    });

    new Sortable(serviceList, {
        group: 'categories',
        animation: 150,
        handle: '.category-name',
        draggable: '.category-item',
        onEnd: function (evt) {
            const categoriesOrder = Array.from(serviceList.children).map(child => {
                return child.querySelector('.category-name .category-header-left span').textContent;
            });
            const updatedCategories = [];
            categoriesOrder.forEach(categoryName => {
                const categoryObj = jsonData.services.find(c => c.categoryName === categoryName);
                if (categoryObj) {
                    updatedCategories.push(categoryObj);
                }
            });
            jsonData.services = updatedCategories;
            updateJSON();
        }
    });
}

function updateStatus(categoryName, serviceName, newStatus) {
    const categoryObj = jsonData.services.find(c => c.categoryName === categoryName);
    if (categoryObj) {
        const serviceObj = categoryObj.services.find(s => s.serviceName === serviceName);
        if (serviceObj) {
            serviceObj.status = newStatus;
            updateJSON();
        }
    }
}

function updateJSON() {
    const updatedJson = JSON.stringify(jsonData, null, 2);
    document.getElementById('jsonEditor').value = updatedJson;
    sendJSONToServer(updatedJson);
}

function updateJSONFromEditor() {
    const editorContent = document.getElementById('jsonEditor').value;
    try {
        const parsedData = JSON.parse(editorContent);
        if (!Array.isArray(parsedData.services)) {
            parsedData.services = convertServicesToNewFormat(parsedData.services);
        }
        jsonData = parsedData;
        sendJSONToServer(editorContent);
        renderServiceList();
        renderMaintenanceAlerts();
        renderStatusUpdates();
        updateToggleStatuses();
        if (jsonData.announcement && jsonData.announcement.text) {
            document.getElementById('announcementText').value = jsonData.announcement.text;
        } else {
            document.getElementById('announcementText').value = '';
        }
    } catch (error) {
        showNotification('Invalid JSON. Please check your input.');
    }
}

function sendJSONToServer(jsonString) {
    const payload = {
        action: 'update_settings',
        data: JSON.parse(jsonString)
    };

    fetch('/api/service', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Status page updated successfully!');
        } else {
            showNotification('Error: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        showNotification('Error updating status page.');
    });
}

function toggleSection(section) {
    jsonData.sections[section] = !jsonData.sections[section];
    updateJSON();
    updateToggleStatuses();
    if (section === 'maintenanceAlerts') {
        renderMaintenanceAlerts();
    } else if (section === 'statusUpdates') {
        renderStatusUpdates();
    } else if (section === 'announcementBar') {
    }
}

function updateToggleStatuses() {
    const maintenanceToggle = document.getElementById('maintenanceAlertsToggle');
    maintenanceToggle.textContent = jsonData.sections.maintenanceAlerts ? 'Disable' : 'Enable';

    const statusUpdatesToggle = document.getElementById('statusUpdatesToggle');
    statusUpdatesToggle.textContent = jsonData.sections.statusUpdates ? 'Disable' : 'Enable';

    const announcementToggle = document.getElementById('announcementToggle');
    announcementToggle.textContent = jsonData.sections.announcementBar ? 'Disable' : 'Enable';
}

function showNotification(message) {
    const notificationBar = document.getElementById('notificationBar');
    const notificationMessage = notificationBar.querySelector('.notification-message');
    notificationMessage.textContent = message;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationBar.classList.remove('show');
        void notificationBar.offsetWidth; 
    }

    notificationBar.classList.add('show');

    notificationTimeout = setTimeout(() => {
        notificationBar.classList.remove('show');
    }, 3000);
}

function showAddMaintenanceModal() {
    editingMaintenanceIndex = null;
    document.getElementById('maintenanceModalTitle').textContent = 'Add Maintenance Alert';
    document.getElementById('maintenanceTitle').value = '';
    document.getElementById('maintenanceMessage').value = '';
    document.getElementById('maintenanceStart').value = '';
    document.getElementById('maintenanceEnd').value = '';
    document.getElementById('maintenanceModal').style.display = 'block';
}

function showEditMaintenanceModal(index) {
    editingMaintenanceIndex = index;
    const alert = jsonData.maintenanceAlerts[index];
    document.getElementById('maintenanceModalTitle').textContent = 'Edit Maintenance Alert';
    document.getElementById('maintenanceTitle').value = alert.title;
    document.getElementById('maintenanceMessage').value = alert.message;
    document.getElementById('maintenanceStart').value = formatDateInput(alert.start);
    document.getElementById('maintenanceEnd').value = formatDateInput(alert.end);
    document.getElementById('maintenanceModal').style.display = 'block';
}

function saveMaintenanceAlert() {
    const title = document.getElementById('maintenanceTitle').value.trim();
    const message = document.getElementById('maintenanceMessage').value.trim();
    const start = document.getElementById('maintenanceStart').value;
    const end = document.getElementById('maintenanceEnd').value;

    if (title && message && start && end) {
        const alert = { title, message, start: new Date(start).toISOString(), end: new Date(end).toISOString() };
        if (editingMaintenanceIndex !== null) {
            jsonData.maintenanceAlerts[editingMaintenanceIndex] = alert;
        } else {
            jsonData.maintenanceAlerts.push(alert);
        }
        updateJSON();
        renderMaintenanceAlerts();
        closeMaintenanceModal();
    } else {
        showNotification('All fields are required.');
    }
}

function deleteMaintenanceAlert(index) {
    pendingAction = () => {
        jsonData.maintenanceAlerts.splice(index, 1);
        updateJSON();
        renderMaintenanceAlerts();
        closeModal();
    };
    showModal('Are you sure you want to delete this maintenance alert?', '');
}

function closeMaintenanceModal() {
    document.getElementById('maintenanceModal').style.display = 'none';
    editingMaintenanceIndex = null;
}

function showAddStatusUpdateModal() {
    editingStatusUpdateIndex = null;
    document.getElementById('statusUpdateModalTitle').textContent = 'Add Status Update';
    document.getElementById('statusUpdateTitle').value = '';
    document.getElementById('statusUpdateMessage').value = '';
    document.getElementById('statusUpdateDate').value = '';
    document.getElementById('statusUpdateColor').value = '#0d6efd';
    document.getElementById('statusUpdateModal').style.display = 'block';
}

function showEditStatusUpdateModal(index) {
    editingStatusUpdateIndex = index;
    const update = jsonData.statusUpdates[index];
    document.getElementById('statusUpdateModalTitle').textContent = 'Edit Status Update';
    document.getElementById('statusUpdateTitle').value = update.title;
    document.getElementById('statusUpdateMessage').value = update.message;
    document.getElementById('statusUpdateDate').value = formatDateInput(update.date);
    document.getElementById('statusUpdateColor').value = update.color || '#0d6efd';
    document.getElementById('statusUpdateModal').style.display = 'block';
}

function saveStatusUpdate() {
    const title = document.getElementById('statusUpdateTitle').value.trim();
    const message = document.getElementById('statusUpdateMessage').value.trim();
    const date = document.getElementById('statusUpdateDate').value;
    const color = document.getElementById('statusUpdateColor').value;

    if (title && message && date && color) {
        const update = { title, message, date: new Date(date).toISOString(), color };
        if (editingStatusUpdateIndex !== null) {
            jsonData.statusUpdates[editingStatusUpdateIndex] = update;
        } else {
            jsonData.statusUpdates.push(update);
        }
        updateJSON();
        renderStatusUpdates();
        closeStatusUpdateModal();
    } else {
        showNotification('All fields are required.');
    }
}

function deleteStatusUpdate(index) {
    pendingAction = () => {
        jsonData.statusUpdates.splice(index, 1);
        updateJSON();
        renderStatusUpdates();
        closeModal();
    };
    showModal('Are you sure you want to delete this status update?', '');
}

function closeStatusUpdateModal() {
    document.getElementById('statusUpdateModal').style.display = 'none';
    editingStatusUpdateIndex = null;
}

function formatDateInput(dateString) {
    const date = new Date(dateString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.slice(0, 16);
}

function showAddServiceModal(categoryName) {
    currentCategory = categoryName;
    document.getElementById('newServiceName').value = '';
    document.getElementById('addServiceModal').style.display = 'block';
}

function closeAddServiceModal() {
    document.getElementById('addServiceModal').style.display = 'none';
    currentCategory = null;
}

function addServiceConfirmed() {
    const serviceName = document.getElementById('newServiceName').value.trim();
    if (serviceName) {
        const categoryObj = jsonData.services.find(c => c.categoryName === currentCategory);
        if (categoryObj) {
            categoryObj.services.push({ serviceName: serviceName, status: 'Operational' });
            updateJSON();
            renderServiceList();
            closeAddServiceModal();
        } else {
            showNotification('Category not found.');
        }
    } else {
        showNotification('Service name cannot be empty.');
    }
}

function showAddCategoryModal() {
    document.getElementById('newCategoryName').value = '';
    document.getElementById('addCategoryModal').style.display = 'block';
}

function closeAddCategoryModal() {
    document.getElementById('addCategoryModal').style.display = 'none';
}

function addCategoryConfirmed() {
    const categoryName = document.getElementById('newCategoryName').value.trim();
    if (categoryName) {
        jsonData.services.push({ categoryName: categoryName, services: [] });
        updateJSON();
        renderServiceList();
        closeAddCategoryModal();
    } else {
        showNotification('Category name cannot be empty.');
    }
}

function deleteService(categoryName, serviceName) {
    pendingAction = () => {
        const categoryObj = jsonData.services.find(c => c.categoryName === categoryName);
        if (categoryObj) {
            categoryObj.services = categoryObj.services.filter(s => s.serviceName !== serviceName);
            updateJSON();
            renderServiceList();
            closeModal();
        } else {
            showNotification('Category not found.');
        }
    };
    showModal(`Are you sure you want to delete "${serviceName}"?`, '');
}

function deleteCategory(categoryName) {
    pendingAction = () => {
        jsonData.services = jsonData.services.filter(c => c.categoryName !== categoryName);
        updateJSON();
        renderServiceList();
        closeModal();
    };
    showModal(`Are you sure you want to delete "${categoryName}"?`, 'This will delete all services inside this category!');
}

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    pendingAction = null;
}

function confirmAction() {
    if (pendingAction) {
        pendingAction();
    }
}

function saveAnnouncement() {
    const announcementText = document.getElementById('announcementText').value.trim();
    if (!jsonData.announcement) {
        jsonData.announcement = {};
    }
    jsonData.announcement.text = announcementText;
    updateJSON();
    showNotification('Announcement updated successfully!');
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
};

document.addEventListener('DOMContentLoaded', function() {
    loadJSON();

    showTab('home');
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        if (document.getElementById('addCategoryModal').style.display === 'block') {
            addCategoryConfirmed();
        } else if (document.getElementById('addServiceModal').style.display === 'block') {
            addServiceConfirmed();
        } else if (document.getElementById('maintenanceModal').style.display === 'block') {
            saveMaintenanceAlert();
        } else if (document.getElementById('statusUpdateModal').style.display === 'block') {
            saveStatusUpdate();
        } else if (document.getElementById('modal').style.display === 'block') {
            confirmAction();
        }
    }
});

function showTab(tab) {
    const tabs = ['home', 'services', 'maintenance', 'statusUpdates', 'announcement', 'jsonEditor'];
    tabs.forEach(t => {
        document.getElementById(`${t}Section`).style.display = t === tab ? 'block' : 'none';
    });
}