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

function fetchEvents() {
    fetch('/users/events', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}` 
        },
    })
    .then(response => response.json())
    .then(events => {
        const eventList = document.querySelector('.appointment-list ul');
        eventList.innerHTML = '';
        events.forEach(event => {
            const li = document.createElement('li');
            li.textContent = `${event.title} - ${event.start_time} to ${event.end_time}`;
            eventList.appendChild(li);
        });
    })
    .catch(error => console.log('Error:', error));
}
