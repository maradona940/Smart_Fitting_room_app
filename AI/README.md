Of course. Here is a clean and precise README.md file based on the provided project structure. It guides a new developer through setup, data generation, model training, running the server, and testing the system.

Smart Fitting Room AI System

This project provides an AI-powered backend service for managing smart retail fitting rooms. It includes functionalities for predicting session durations, detecting potential theft anomalies, and intelligently assigning rooms to customers to optimize throughput.

Key Features

AI-Powered Duration Prediction: Predicts how long a customer will likely spend in a fitting room based on the items they take in.

Anomaly Detection: Identifies suspicious sessions (e.g., unusually long durations, missing items upon exit) to alert staff of potential theft.

Intelligent Room Assignment: A 'Best Fit' algorithm that assigns customers to a fitting room to minimize their total wait and session time, improving customer flow.

Real-time Room Status: An endpoint to monitor the current status (available/occupied) of all fitting rooms.

FastAPI Backend: A modern, high-performance API built with FastAPI, including automatic interactive documentation.

Project Structure
code
Code
download
content_copy
expand_less
.
├── api.py              # Main FastAPI application with all endpoints
├── models.py           # ML model classes (DurationPredictor, AnomalyDetector)
├── simulate_data.py    # Script to generate mock data for items and sessions
├── train.py            # Script to train and save the ML models
├── integration_test.py # Script to run integration tests against the live API
├── requirements.txt    # Python dependencies
|
├── data/               # (Generated) Contains mock data files
│   ├── item_database.json
│   └── historical_sessions.csv
|
└── models/             # (Generated) Contains trained model files
    ├── duration_model.pkl
    └── anomaly_model.pkl
Setup and Installation

Follow these steps to set up your local environment.

1. Clone the Repository

code
Bash
download
content_copy
expand_less
git clone <your-repository-url>
cd <repository-name>

2. Create and Activate a Virtual Environment
It is highly recommended to use a virtual environment to manage dependencies.

code
Bash
download
content_copy
expand_less
# For Unix/macOS
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate

3. Install Dependencies
Install all required Python packages from the requirements.txt file.

code
Bash
download
content_copy
expand_less
pip install -r requirements.txt
How to Run the System (4-Step Workflow)

The system requires a specific sequence of steps to become fully operational.

Step 1: Generate Mock Data

The models need historical data to train on. Run the simulate_data.py script to generate this. This will create a data/ directory containing item_database.json and historical_sessions.csv.

code
Bash
download
content_copy
expand_less
python simulate_data.py
Step 2: Train the AI Models

Next, train the duration and anomaly models using the data generated in the previous step. This script will create a models/ directory and save the trained models (.pkl files) inside it.

code
Bash
download
content_copy
expand_less
python train.py
Step 3: Start the API Server

With the data and models in place, you can now start the FastAPI server.

code
Bash
download
content_copy
expand_less
uvicorn api:app --reload

The API will be available at http://127.0.0.1:8000. The --reload flag enables hot-reloading for development.

Step 4: Test the System (Optional but Recommended)

In a new terminal window (while the API server from Step 3 is still running), run the integration test script to verify that all endpoints are working correctly.

code
Bash
download
content_copy
expand_less
python integration_test.py

This script will simulate filling up rooms, handling a waitlist, releasing a room, and checking the prediction and anomaly endpoints.

API Endpoints

Once the server is running, you can interact with the following endpoints. For a full, interactive experience, visit the auto-generated Swagger documentation at http://127.0.0.1:8000/docs.

Method	Endpoint	Description
GET	/	Welcome message for the API.
POST	/assign_room	Intelligently assigns a room or provides an estimated wait time.
GET	/rooms/status	Returns the current status of all fitting rooms.
POST	/predict_duration	Predicts the duration of a session based on items and entry time.
POST	/detect_anomaly	Analyzes a completed session for anomalies and releases the room.

Example /assign_room Request Body:

code
JSON
download
content_copy
expand_less
{
  "item_ids": ["sku-0042", "sku-0015"]
}

Example /detect_anomaly Request Body:

code
JSON
download
content_copy
expand_less
{
  "session_id": "some-unique-session-id",
  "room_id": "room_1",
  "actual_duration": 15.5,
  "predicted_duration": 12.0,
  "entry_scans": ["sku-0042", "sku-0015"],
  "exit_scans": ["sku-0042"],
  "entry_time": "2023-11-21T14:30:00Z"
}
Technology Stack

Backend: FastAPI, Uvicorn

Machine Learning: Scikit-learn

Data Handling: Pandas, NumPy

API Client: Requests
