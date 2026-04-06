import joblib

priority_model = joblib.load("priority_model.pkl")
department_model = joblib.load("department_model.pkl")
category_model = joblib.load("category_model.pkl")

def classify_complaint(text: str):
    priority = priority_model.predict([text])[0]
    department = department_model.predict([text])[0]
    category = category_model.predict([text])[0]

    return department, category, priority