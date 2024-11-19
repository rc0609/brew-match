import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf

# Load the coffee shop data
file_path = 'coffee_shops.csv'  # Update with the correct file path
coffee_shops_data = pd.read_csv(file_path)

# Relevant features for recommendations
columns_to_use = [
    "rating",
    "priceLevel",
    "servesCoffee",
    "servesDessert",
    "servesBreakfast",
    "liveMusic",
    "takeout",
    "delivery",
    "dineIn",
]

# Preprocess coffee shop features
coffee_shops_features = coffee_shops_data[columns_to_use]
binary_columns = ["servesCoffee", "servesDessert", "servesBreakfast", "liveMusic", "takeout", "delivery", "dineIn"]
coffee_shops_features[binary_columns] = coffee_shops_features[binary_columns].astype(int)

# Normalize the data
scaler = MinMaxScaler()
X = scaler.fit_transform(coffee_shops_features.values)

# Split into training and testing sets
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

# Define the neural network model
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(X_train.shape[1],)),
    tf.keras.layers.Dense(64, activation="relu"),
    tf.keras.layers.Dense(32, activation="relu"),
    tf.keras.layers.Dense(X_train.shape[1], activation="sigmoid")  # Outputs match feature format
])

# Compile the model
model.compile(optimizer="adam", loss="mse", metrics=["accuracy"])

# Train the model
model.fit(X_train, X_train, epochs=20, batch_size=8, verbose=1)

# Example quiz data: [Rating Preference, Price Level, Coffee, Dessert, Breakfast, Music, Takeout, Delivery, Dine-in]
user_quiz_data = np.array([
    [4.5, 2, 1, 1, 0, 1, 1, 0, 1]
])

# Normalize quiz data
user_quiz_data_normalized = scaler.transform(user_quiz_data)

# Predict coffee shop recommendations
recommendations = model.predict(user_quiz_data_normalized)

# Convert predictions back to original scale
recommended_shops = scaler.inverse_transform(recommendations)

# Display recommended coffee shop details
recommended_shops_df = pd.DataFrame(recommended_shops, columns=columns_to_use)
print("Recommended Coffee Shops:")
print(recommended_shops_df)

