import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import ast

def preprocess_dataset(input_file, output_file):
    # Load data
    coffee_shops_data = pd.read_csv(input_file)

    # Handle missing values
    coffee_shops_data['rating'].fillna(coffee_shops_data['rating'].mean(), inplace=True)
    coffee_shops_data['priceLevel'].fillna(0, inplace=True)

    # Normalize numerical data
    scaler = MinMaxScaler()
    coffee_shops_data[['rating', 'userRatingCount', 'priceLevel']] = scaler.fit_transform(
        coffee_shops_data[['rating', 'userRatingCount', 'priceLevel']]
    )

    # One-hot encode `types`
    types_dummies = coffee_shops_data['types'].str.get_dummies(';')
    coffee_shops_data = pd.concat([coffee_shops_data, types_dummies], axis=1)

    # Convert binary columns to integers
    binary_columns = ['servesCoffee', 'servesDessert', 'servesBreakfast', 'liveMusic', 'takeout', 'delivery', 'dineIn']
    for col in binary_columns:
        coffee_shops_data[col] = coffee_shops_data[col].astype(int)

    # Extract JSON-like features
    coffee_shops_data['paymentOptions'] = coffee_shops_data['paymentOptions'].apply(ast.literal_eval)
    payment_options = coffee_shops_data['paymentOptions'].apply(pd.Series)
    coffee_shops_data = pd.concat([coffee_shops_data, payment_options], axis=1)

    # Save preprocessed data
    coffee_shops_data.to_csv(output_file, index=False)
    print(f"Preprocessed data saved to {output_file}")

if __name__ == "__main__":
    input_file = "coffee_shops.csv"
    output_file = "preprocessed_coffee_shops.csv"
    preprocess_dataset(input_file, output_file)
