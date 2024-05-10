document.addEventListener("DOMContentLoaded", function() {
    const nav = document.querySelector('nav ul');
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const main = document.querySelector('main');

    // render data depending on if user is logged in or not
    if (isLoggedIn === "true") {
        main.style.display = 'block';
        nav.innerHTML = `
            <li><a href="profile.html">Profile</a></li>
            <li><a href="index.html" onclick="logout()">Logout</a></li>
        `;
        fetchEvents();
    } else {
        nav.innerHTML = `
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
    }

    const form = document.getElementById('createEventForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const start_time = document.getElementById('start_time').value;
        const end_time = document.getElementById('end_time').value;

        createEvent({ title, description, start_time, end_time });
    });
});

function logout() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = 'login.html';
}

// POST for user to create new events
function createEvent(eventData) {
    fetch('/users/create-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(eventData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create the event due to a scheduling conflict or other issue');
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        alert('Event created successfully!');
        fetchEvents(); // Reload events after creation
    })
    .catch((error) => {
        console.error('Error:', error);
        alert(error.message); // Display a more user-friendly error message
    });
}

// close update event form
document.querySelectorAll('.close-button').forEach(button => {
    button.onclick = function() {
        document.getElementById('updateModal').style.display = 'none';
    };
});

document.getElementById('updateEventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const eventId = document.getElementById('updateEventId').value;
    updateEvent(eventId);
});

function populateUpdateModel(event) {
    document.getElementById('updateModel').style.display = 'block';
    document.getElementById('updateTitle').value = event.title;
    document.getElementById('updateDescription').value = event.description;
    document.getElementById('updateStartTime').value = event.start_time;
    document.getElementById('updateEndTime').value = event.end_time;
    document.getElementById('updateEventId').value = event.event_id;
}

function updateEvent(eventId) {
    const payload = {};
    if(!eventId) return('no eventId');
    // Retrieve values from the form and add to payload if non-empty
    const title = document.getElementById('updateTitle').value;
    const description = document.getElementById('updateDescription').value;

    if (title) payload.title = title;
    if (description) payload.description = description;

    const startTime = document.getElementById('updateStartTime').value;
    const endTime = document.getElementById('updateEndTime').value;

    if (startTime) payload.start_time = startTime;
    if (endTime) payload.end_time = endTime;

    fetch(`/users/events/${eventId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update event');
        }
        return response.json();
    })
    .then(data => {
        console.log('Event updated successfully:', data);
        document.getElementById('updateModel').style.display = 'none';
        fetchEvents();  // Refresh the event list
    })
    .catch(error => {
        console.error('Error updating event:', error);
        alert('Failed to update event');
    })
}

// format datetime in prettier format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString('en-US', options);
}

function fetchEvents() {
    fetch('/users/events', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
    })
    .then(response => response.json())
    .then(events => {
        const tableBody = document.querySelector('#eventTableBody');
        tableBody.innerHTML = ''; // Clear the table body to remove previous rows

        document.getElementById('close-button').onclick = () => {
            document.getElementById('updateModel').style.display = 'none'
        }

        events.forEach(event => {
            console.log(event);
            const row = tableBody.insertRow(); // Create a new table row

            const titleCell = row.insertCell();
            titleCell.textContent = event.title;

            const descriptionCell = row.insertCell();
            descriptionCell.textContent = event.description || 'No description';

            const startCell = row.insertCell();
            startCell.textContent = formatDate(event.start_time);

            const endCell = row.insertCell();
            endCell.textContent = formatDate(event.end_time);

            // Create action cell for buttons
            const actionCell = row.insertCell();

            // Create update button
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.onclick = () => {
                document.getElementById('updateModel').style.display = 'block'
                document.getElementById('updateEventId').value = event.event_id;
                populateUpdateModel(event);
            };
            actionCell.appendChild(updateButton);

            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => {
                deleteEvent(event.event_id);
            };
            actionCell.appendChild(deleteButton);
        });
    })
    .catch(error => console.log('Error:', error));
}

function deleteEvent(eventId) {
    fetch(`/users/events/${eventId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`, 
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete the event');
        }
        return response.json(); 
    })
    .then(data => {
        console.log('Event deleted successfully:', data);
        fetchEvents();  // Refresh the event list
    })
    .catch(error => {
        console.error('Error deleting event:', error);
        alert('Failed to delete event: ' + error.message);
    });
}