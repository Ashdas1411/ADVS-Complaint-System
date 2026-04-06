import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import joblib

# Load dataset
with open("dataset.json", "r") as f:
    data = json.load(f)

df = pd.DataFrame(data)

# Split data
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# Create pipelines
priority_model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

department_model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

category_model = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

# Train models
priority_model.fit(train_df["text"], train_df["priority"])
department_model.fit(train_df["text"], train_df["department"])
category_model.fit(train_df["text"], train_df["category"])

# Evaluate
print("Priority Accuracy:", priority_model.score(test_df["text"], test_df["priority"]))
print("Department Accuracy:", department_model.score(test_df["text"], test_df["department"]))
print("Category Accuracy:", category_model.score(test_df["text"], test_df["category"]))

# Save models
joblib.dump(priority_model, "priority_model.pkl")
joblib.dump(department_model, "department_model.pkl")
joblib.dump(category_model, "category_model.pkl")

print("Models trained and saved!")