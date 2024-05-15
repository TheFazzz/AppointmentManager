import collections
import contextlib
import logging.config
import secrets
import base64
import time
import sqlite3
from typing import Optional, List
import database


from fastapi.responses import HTMLResponse
from fastapi.routing import APIRoute
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from database import *
from models import *


app = FastAPI()

# Mount static files, for the front-end files in the 'front-end' folder
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def read_index():
    return {"message": "Visit /static/index.html to see the frontend"}

# User login endpoint
@app.post("/login")
def login(
    user: LoginRequest, 
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    try:
        # Authenticate the user
        cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
        user_data = cursor.fetchone()
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        stored_user = {
            "id": user_data[0],
            "firstName": user_data[1],
            "lastName": user_data[2],
            "email": user_data[3],
            "password_hash": user_data[4],
        }

        if not verify_password(user.password, stored_user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = stored_user["id"]
        first_name = stored_user["firstName"]
        last_name = stored_user["lastName"]

        # Create access token
        token_data = {
            "sub": str(user_id),
            "first_name": first_name,
            "last_name": last_name
        }
        
        access_token = create_access_token(data=token_data)

        return_data = {"access_token": access_token, "token_type": "bearer"}

        return return_data
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
   

# User logut endpoint
@app.post("/logout")
def logout():
    # For logout endpoint there is JWT, so don't need to do anything on the server side
    # the client(front-end) discards the access token
    return {"message": "Logout successful"}

# New Users register endpoint
@app.post("/register")
def register(
    req: RegisterRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    hashed_password = hash_password(req.password) # hash password
    try:
        cursor.execute(
            """
            INSERT INTO Users (first_name, last_name, email, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            (req.first_name, req.last_name, req.email, hashed_password)
        )
        # Commit the changes to the database
        db.commit()


        user_id = cursor.lastrowid  # Get the inserted user ID
        return {"user_id": user_id}

    except sqlite3.IntegrityError as e:
        # Check if the error is due to a duplicate email
        if 'UNIQUE constraint failed: users.email' in str(e):
            raise HTTPException(status_code=400, detail="Email is already in use")
        else:
            raise HTTPException(status_code=500, detail="Internal Server Error")
 
# Update user info endpoint       
@app.put("/users/user", response_model=dict)
def update_user(
    req: UpdateUserRequest,
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    user_id = int(user['sub'])
    cursor = db.cursor()
    
    update_data = req.dict(exclude_unset=True)
    
    if 'password' in update_data:
        update_data['password_hash'] = hash_password(update_data['password'])
        del update_data['password']  # Remove plain password from dict

    if update_data:
        set_clause = ', '.join([f"{key} = ?" for key in update_data.keys()])
        values = list(update_data.values()) + [user_id]

        # Dynamically create SQL based on provided fields
        cursor.execute(f"UPDATE Users SET {set_clause} WHERE user_id = ?", values)
        cursor.connection.commit()
        return {"message": "User updated successfully"}
    else:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")



# User create new event endpoint
@app.post("/users/create-event")
def add_user_events(
    req: CreateEventRequest,
    user = Depends(get_current_user),  # get the current user
    db: sqlite3.Connection = Depends(get_db)
):    
    cursor = db.cursor()
  
    try:
        user_id = int(user["sub"])
        
        # Check for overlapping event times
        # Event starts before and ends after the new event
        # Event starts within the new event
        # Event ends within the new event
        cursor.execute(
            """
            SELECT 1 FROM Events WHERE user_id = ? AND (
                (start_time <= ? AND end_time >= ?) OR 
                (start_time >= ? AND start_time < ?) OR
                (end_time > ? AND end_time <= ?)
            )
            """,
            (user_id, req.start_time, req.end_time, req.start_time, req.end_time, req.start_time, req.end_time)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Event times overlap with an existing event")
        
        # Insert new event if no overlap
        cursor.execute(
            """
            INSERT INTO Events (user_id, title, description, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, req.title, req.description, req.start_time, req.end_time)
        )
              
        db.commit()

        # Retrieve the newly created event
        event_id = cursor.lastrowid
        return {"message": "Event created successfully", "event_id": event_id}

    except sqlite3.IntegrityError as e:
        if "FOREIGN KEY constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        else:
            raise HTTPException(status_code=500, detail="Internal Server Error")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Get Users events endpoint    
@app.get("/users/events")
def get_user_events(
    filter: str = None,
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    current_time = datetime.now()
  
    try:
        # Convert user_id from token to an int
        user_id = int(user["sub"])
        
        # User options for appointment viewing        
        if filter == "upcoming":
            cursor.execute(
                """
                SELECT * FROM Events WHERE user_id = ? 
                AND start_time > ? ORDER BY start_time ASC
                """, 
                (user_id, current_time)
            )
        elif filter == "past":
            cursor.execute(
                """
                SELECT * FROM Events WHERE user_id = ? 
                AND start_time < ? ORDER BY start_time DESC
                """, 
                (user_id, current_time)
            )
        else:
            cursor.execute(
                """
                SELECT * FROM Events WHERE user_id = ?
                ORDER BY start_time ASC
                """, 
                (user_id,)
            )

        
        events = cursor.fetchall()
        return events

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# User update existing event endpoint    
@app.put("/users/events/{event_id}")
def update_user_event(
    event_id: int,
    req: UpdateEventRequest,
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    user_id = int(user["sub"])
    cursor = db.cursor()
    try:
        cursor.execute("SELECT user_id, start_time, end_time FROM Events WHERE event_id = ?", (event_id,))
        event = cursor.fetchone()
        
        if not event or event[0] != user_id:
            raise HTTPException(status_code=404, detail="Event not found or not accessible")

        if req.start_time or req.end_time:
            start_time = req.start_time if req.start_time else event['start_time']
            end_time = req.end_time if req.end_time else event['end_time']
            # Event starts before and ends after the new event
            # Event starts within the new event
            # Event ends within the new event
            cursor.execute(
                """
                SELECT 1 FROM Events WHERE user_id = ? AND event_id != ? AND (
                    (start_time < ? AND end_time > ?) OR
                    (start_time > ? AND start_time < ?) OR
                    (end_time > ? AND end_time < ?)
                )
                """,
                (user_id, event_id, end_time, start_time, start_time, end_time, start_time, end_time)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Event times overlap with an existing event")

        
        # Dynamicaly create SQL query depending on which attributes user wants to update
        fields = {k: v for k, v in req.dict().items() if v is not None}
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided for update")
        
        set_clause = ", ".join([f"{key} = ?" for key in fields])
        values = list(fields.values()) + [event_id, user["sub"]]

        cursor.execute(f"UPDATE Events SET {set_clause} WHERE event_id = ? AND user_id = ?", values)
        db.commit()
        return {"message": "Event updated successfully"}

    except sqlite3.IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data provided")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# User delete existing event endpoint    
@app.delete("/users/events/{event_id}")
def delete_user_event(
    event_id: int,
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()

    try:
        user_id = int(user["sub"])
        
        # Check if the event belongs to the user
        cursor.execute(
            """
            SELECT user_id, start_time FROM Events WHERE event_id = ?
            """,
            (event_id,)
        )
        event = cursor.fetchone()
        if not event or event[0] != user_id:
            raise HTTPException(status_code=404, detail="Event not found or not accessible")

        # If the event belongs to the user, proceed with deletion
        # User confirmation done on the front-end
        cursor.execute(
            """
            DELETE FROM Events WHERE event_id = ? AND user_id = ?
            """,
            (event_id, user_id)
        )
        db.commit()
        
        return {"message": "Event deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
