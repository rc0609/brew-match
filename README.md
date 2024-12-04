![Logo](img/brew-match-logo-black.png)

# BrewMatch

A coffee shop directory that matches users with coffee shops based on their preferences and lifestyle.

## Table of Contents

- [About The Project](#about-the-project)
- [Prerequisites](#prerequisites)
- [Installation](#installation-and-setup)
- [Features](#features)

---

## About The Project

BrewMatch is an innovative coffee shop directory that takes the stress out of choosing the perfect coffee spot. By combining quiz-based user preferences and interactive features, BrewMatch suggests coffee shops that align with users' preferences for ambiance, food, accessibility, and more.

The platform leverages advanced technologies such as Google APIs and geolocation services to create a personalized experience for every user. Whether you're looking for a cozy café to study, a vibrant spot to hang out with friends, or just the best coffee in town, BrewMatch has you covered.

## Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MongoDB
- Firebase account
- Google Cloud Platform account
- Outscraper account

## API Keys and Service Setup

### 1. Google Cloud Platform Setup

1. Create a new project in Google Cloud Console
2. Enable the following APIs:
   - Places API
   - Maps JavaScript API
   - Geocoding API
3. Create API credentials (API key) with the following restrictions:
   - Application restrictions: HTTP referrers (websites)
   - API restrictions: Places API, Maps JavaScript API, Geocoding API

### 2. Firebase Setup

1. Create a new Firebase project
2. Enable Authentication with email/password and anonymous sign-in
3. Create a Firestore database
4. Create a Realtime Database
5. Get your Firebase configuration object from Project Settings > General > Your apps > Web app

### 3. Outscraper Setup

1. Create an Outscraper account
2. Generate an API key from your dashboard

### 4. MongoDB Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Whitelist your IP address

## Project Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URI=your_mongodb_connection_string
GOOGLE_PLACES_API_KEY=your_google_places_api_key
OUTSCRAPER_API_KEY=your_outscraper_api_key
```

### 2. Firebase Configuration

Create a `config.js` file in the root directory:

```javascript
const config = {
  firebase: {
    apiKey: "your_firebase_api_key",
    authDomain: "your_project.firebaseapp.com",
    projectId: "your_project_id",
    storageBucket: "your_project.appspot.com",
    messagingSenderId: "your_messaging_sender_id",
    appId: "your_app_id",
    measurementId: "your_measurement_id",
    databaseURL: "your_database_url",
  },
  googlePlaces: {
    apiKey: "your_google_places_api_key",
  },
  outscraper: {
    apiKey: "your_outscraper_api_key",
  },
};

export default config;
```

## Installation and Setup

### 1. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic pymongo python-dotenv

# Start the backend server
uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
# Install live-server globally
npm install -g live-server

# Start the frontend server
live-server
```

## Features

### Authentication System

- Email/password authentication
- Anonymous sign-in
- User profile management
- Session management

### Coffee Shop Quiz

- Personalized recommendations
- Location-based matching
- Preference analysis
- Real-time results

### Study Rooms

- Real-time collaboration
- Whiteboard functionality
- Chat system
- Room management

### Maps and Search

- Interactive map interface
- Real-time popularity data
- Advanced filtering
- Detailed coffee shop profiles

---

[(back to top)](#brewmatch)
