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
   


@app.post("/logout")
def logout():
    # For a logout endpoint with JWT, you don't need to do anything on the server side
    # the client(front-end) discards the access token
    return {"message": "Logout successful"}


@app.post("/register")
def register(
    req: RegisterRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
    hashed_password = hash_password(req.password)
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

@app.post("/users/create-event")
def add_user_events(
    req: CreateEventRequest,
    user = Depends(get_current_user),  # get the current user
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
  
    try:
        user_id = int(user["sub"])
        # Construct the SQL query
        cursor.execute(
            """
            INSERT INTO Events (user_id, title, description, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, req.title, req.description, req.start_time, req.end_time)
        )
              
        # Commit to db
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
    
@app.get("/users/events", response_model=List[Event])
def get_user_events(
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()
  
    try:
        user_id = int(user["sub"])
        cursor.execute(
            """
            SELECT event_id, title, description, start_time, end_time
            FROM Events
            WHERE user_id = ?
            """,
            (user_id,)
        )
        rows = cursor.fetchall()
        events = [Event(event_id=row[0], title=row[1], description=row[2], start_time=row[3], end_time=row[4]) for row in rows]
        
        return events

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@app.delete("/users/events/{event_id}", status_code=204)
def delete_user_event(
    event_id: int,
    user = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.cursor()

    try:
        user_id = int(user["sub"])
        
        # First, check if the event belongs to the user
        cursor.execute(
            """
            SELECT user_id FROM Events WHERE event_id = ?
            """,
            (event_id,)
        )
        event = cursor.fetchone()
        if not event or event[0] != user_id:
            raise HTTPException(status_code=404, detail="Event not found or not accessible")

        # If the event belongs to the user, proceed with deletion
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
