// Decode JWT token
function getPayloadFromToken(token) {
    const base64Url = token.split('.')[1]; // get payload from token
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}


const token = localStorage.getItem('access_token'); 
if (token) {
    const payload = getPayloadFromToken(token);
    const userName = payload.first_name;
    document.getElementById('greeting').textContent = `Hello ${userName}`;
}

document.addEventListener("DOMContentLoaded", function() {
    const nav = document.querySelector('nav ul');
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const main = document.querySelector('main');

    // render data depending on if user is logged in or not
    if (isLoggedIn === "true") {
        main.style.display = 'block';
        nav.innerHTML = `
            <li><a href="#" id="profileLink">Profile</a></li>
            <li><a href="index.html" onclick="logout()">Logout</a></li>
        `;
        fetchEvents();

        // Adding the listener inside DOMContentLoaded after setting innerHTML
        document.getElementById("profileLink").addEventListener("click", function() {
            document.getElementById("profileModel").style.display = "block";
        });
    } else {
        nav.innerHTML = `
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
    }
});

document.getElementById("p-close-button").addEventListener("click", function() {
    document.getElementById("profileModel").style.display = "none";
});

document.getElementById("updateProfileForm").addEventListener("submit", function(event) {
    event.preventDefault();
    updateProfile();
});

function updateProfile() {
    const body = {};

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;
    if (email) body.email = email;
    if (password) body.password = password;
    
    fetch('/users/user', {  
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => {
        console.log(JSON.stringify(body))
        if (!response.ok) {
            const errorMessage = data.detail || "Failed to update profile";
            throw new Error(errorMessage);
        }
        return data;
    }))
    .then(data => {
        showAlert("Success", "Profile updated successfully!", false);
        document.getElementById('updateProfileForm').reset(); // Reset the form
        document.getElementById("profileModel").style.display = "none"; // Close the modal on successful update
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showAlert("Error", error.message, false);
    });  
}

function logout() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = 'login.html';
}

// Form for User create new Event
const form = document.getElementById('createEventForm');
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const start_time = document.getElementById('start_time').value;
    const end_time = document.getElementById('end_time').value;

    // Convert the input datetime to a date object
    // Create current date object
    const startTimeDate = new Date(start_time);
    const currentTime = new Date();

    // Check if the event startTime is in the past
    if (startTimeDate < currentTime) {
        showAlert("Error","Cannot create an appointment in the past. Please choose a future date and time.", false);
        return; // Stop the form submission
    }

    createEvent({ title, description, start_time, end_time });
});

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
            return response.json().then(data => {
                showAlert("Error", "Failed to create the event due to a scheduling conflict or other issue", false);
                throw new Error("Failed to create event");
            });
        }
        return response.json();
    })    .then(data => {
        showAlert("Success","Event created successfully!", false);
        document.getElementById('createEventForm').reset(); // Reset the form
        fetchEvents(); // Reload events after creation
        
    })
    .catch((error) => {
        console.error('Error:', error);
        showAlert("Error", "An unexpected error occurred while creating event.", false); 
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


// Update an existing event (PUT Request)
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
            return response.json().then(data => {
                showAlert("Error", data.detail || "Failed to update event. Please try again", false);
                throw new Error("Failed to update event");
            });
        }
        return response.json();
    })
    .then(data => {
        showAlert("Success", "Event updated successfully", false);
        document.getElementById('updateEventForm').reset(); // Reset the form
        document.getElementById('updateModel').style.display = 'none';
        fetchEvents();  // Refresh the event list
    })
    .catch(error => {
        console.error('Error updating event:', error);
        // If an error reaches here, it means it wasn't caught in the non-ok response block
        showAlert("Error", "An unexpected error occurred while updating the event.", false);

    })
}

// format datetime in a better user readable output
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString('en-US', options);
}

// Get all events for User
function fetchEvents(filter = '') {
    fetch(`/users/events${filter ? `?filter=${filter}` : ''}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
    })
    .then(response => response.json())
    .then(events => {
        const tableBody = document.querySelector('#eventTableBody');
        tableBody.innerHTML = ''; // Clear previous entries

        document.getElementById('close-button').onclick = () => {
            document.getElementById('updateModel').style.display = 'none'
        }

        events.forEach(event => {
            const row = tableBody.insertRow(); // Create a new table row

            const titleCell = row.insertCell();
            titleCell.className = 'title';
            titleCell.textContent = event.title;

            const descriptionCell = row.insertCell();
            descriptionCell.className = 'description'
            descriptionCell.textContent = event.description || 'No description';

            const startCell = row.insertCell();
            startCell.className = 'time';
            startCell.textContent = formatDate(event.start_time);

            const endCell = row.insertCell();
            endCell.className = 'time';
            endCell.textContent = formatDate(event.end_time);

            // Create action cell for update/delete buttons
            const actionCell = row.insertCell();

            // Create update button
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.onclick = () => {
                document.getElementById('updateModel').style.display = 'block'
                document.getElementById('updateEventId').value = event.event_id;
            };
            actionCell.appendChild(updateButton);

            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => {
                showAlert("Confirm Delete", "Are you sure you want to delete this event?", true, () => deleteEvent(event.event_id));
            };
            
            actionCell.appendChild(deleteButton);
        });
    })
    .catch(error => console.log('Error:', error));
}

// EvenListener's for filter option
document.getElementById('filterAll').addEventListener('click', () => {
    fetchEvents();
    document.getElementById('currentFilter').textContent = 'Viewing All Appointments'; 
});

document.getElementById('filterUpcoming').addEventListener('click', () => {
    fetchEvents('upcoming');
    document.getElementById('currentFilter').textContent = 'Viewing Upcoming Appointments';
});

document.getElementById('filterPast').addEventListener('click', () => {
    fetchEvents('past');
    document.getElementById('currentFilter').textContent = 'Viewing Past Appointments';
});

// Delete user event using async/await
async function deleteEvent(eventId) {
    try {
        const response = await fetch(`/users/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`, 
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete the event');
        }

        const data = await response.json();
        console.log('Event deleted successfully:', data);
        showAlert("Success", "Event has been deleted successfully!", false);
        fetchEvents();  // Refresh the event list
    } catch (error) {
        console.error('Error deleting event:', error);
        showAlert("Error", 'Failed to delete event: ' + error.message, false);
    }
}


// function for alert pop up windows
function showAlert(title, message, canConfirm, onConfirm) {
    const modal = document.getElementById('alertModal');
    const modalTitle = document.getElementById('alertTitle');
    const modalMessage = document.getElementById('alertMessage');
    const modalButtons = document.getElementById('modalButtons');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalButtons.innerHTML = ''; // Clear any existing buttons
    if (canConfirm) {
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.onclick = function() {
            onConfirm();
            closeModal();
        };
        modalButtons.appendChild(okButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = closeModal;
        modalButtons.appendChild(cancelButton);
    } else {
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.onclick = closeModal;
        modalButtons.appendChild(okButton);
    }

    modal.style.display = "flex";
}


function closeModal() {
    const modal = document.getElementById('alertModal');
    modal.style.display = "none";
}
