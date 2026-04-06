# import joblib

# priority_model = joblib.load("priority_model.pkl")
# department_model = joblib.load("department_model.pkl")
# category_model = joblib.load("category_model.pkl")

# def classify_complaint(text: str):
#     priority = priority_model.predict([text])[0]
#     department = department_model.predict([text])[0]
#     category = category_model.predict([text])[0]

#     return department, category, priority

import joblib
import os

# Get correct base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build full paths
priority_path = os.path.join(BASE_DIR, "priority_model.pkl")
department_path = os.path.join(BASE_DIR, "department_model.pkl")
category_path = os.path.join(BASE_DIR, "category_model.pkl")

# Load models
priority_model = joblib.load(priority_path)
department_model = joblib.load(department_path)
category_model = joblib.load(category_path)


def classify_complaint(text: str):
    priority = priority_model.predict([text])[0]
    department = department_model.predict([text])[0]
    category = category_model.predict([text])[0]

    return department, category, priority