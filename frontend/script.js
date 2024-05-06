document.addEventListener("DOMContentLoaded", function() {
    const nav = document.querySelector('nav ul');
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn === "true") {
        nav.innerHTML = `
            <li><a href="appointments.html">My Appointments</a></li>
            <li><a href="profile.html">Profile</a></li>
            <li><a href="logout.html" onclick="logout()">Logout</a></li>
        `;
        fetchEvents();
    } else {
        nav.innerHTML = `
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
        //window.location.href = 'login.html'; // Redirect if not logged in
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

function createEvent(eventData) {
    fetch('/users/create-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(eventData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        fetchEvents(); // Reload events after creation
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

function showModel(event) {
    document.getElementById('updateModel').style.display = 'block';
    document.getElementById('updateTitle').value = event.title;
    document.getElementById('updateStartTime').value = event.start_time;
    document.getElementById('updateEndTime').value = event.end_time;
    document.getElementById('updateEventId').value = event.event_id;
}

document.querySelectorAll('.close-button').forEach(button => {
    button.onclick = function() {
        document.getElementById('updateModal').style.display = 'none';
    };
});

document.getElementById('updateEventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    updateEvent();
});

function updateEvent() {
    const eventId = document.getElementById('updateEventId').value;
    const title = document.getElementById('updateTitle').value;
    const startTime = document.getElementById('updateStartTime').value;
    const endTime = document.getElementById('updateEndTime').value;

    fetch(`/users/events/${eventId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ title, start_time: startTime, end_time: endTime })
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
            const row = tableBody.insertRow(); // Create a new table row

            // Insert cells for the event title, start time, and end time
            const titleCell = row.insertCell();
            titleCell.textContent = event.title;

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
                console.log('Update Event:', event.event_id); // Placeholder for update functionality
            };
            actionCell.appendChild(updateButton);

            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => {
                console.log('Delete Event:', event.event_id); // Placeholder for delete functionality
            };
            actionCell.appendChild(deleteButton);
        });
    })
    .catch(error => console.log('Error:', error));
}

