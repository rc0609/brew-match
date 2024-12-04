import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import config from "./config.js";
const apiKey = config.googlePlaces.apiKey;

const firebaseConfig = config.firebase;

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();

//holds the current quiz state
let quizState = {
  currentQuestion: 0,
  answers: {},
  complete: false,
  userId: null,
  location: null,
  allPlaces: [],
};

const PRICE_LEVEL_MAPPING = {
  PRICE_LEVEL_UNSPECIFIED: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const geolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
};

function getEmojiRating(rating) {
  const fullStar = "⭐";
  const emptyStar = "☆";
  const roundedRating = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(roundedRating);
  const halfStar = roundedRating - fullStars === 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    fullStar.repeat(fullStars) +
    (halfStar ? "⭐️" : "") +
    emptyStar.repeat(emptyStars)
  );
}

const quizQuestions = [
  {
    id: "pricePreference",
    text: "What's your preferred price range?",
    options: [
      { value: 1, label: "Budget-friendly" },
      { value: 2, label: "Moderate" },
      { value: 3, label: "High-end" },
    ],
  },
  {
    id: "atmosphere",
    text: "What type of service do you prefer?",
    options: [
      { value: "quick", label: "Quick service / Takeout" },
      { value: "casual", label: "Casual dine-in" },
      { value: "full", label: "Full-service experience" },
    ],
  },
  {
    id: "foodImportance",
    text: "How important is food selection?",
    options: [
      { value: "coffee", label: "Just coffee is fine" },
      { value: "snacks", label: "Like having desserts/snacks" },
      { value: "full", label: "Full breakfast/food menu important" },
    ],
  },
  {
    id: "timing",
    text: "When do you usually visit coffee shops?",
    options: [
      { value: "morning", label: "Early morning (before 9 AM)" },
      { value: "day", label: "During the day" },
      { value: "evening", label: "Evening" },
    ],
  },
  {
    id: "accessibility",
    text: "Which features are important to you?",
    options: [
      { value: "parking", label: "Parking availability" },
      { value: "accessibility", label: "Wheelchair accessibility" },
      { value: "payment", label: "Modern payment options (NFC/Cards)" },
    ],
  },
];

//makes a call to google places API to retrieve coffee shops within 1.5km distance of the user
async function fetchNearbyPlaces(location) {
  console.log("Starting fetchNearbyPlaces");
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  const body = {
    includedTypes: ["coffee_shop", "cafe"],
    maxResultCount: 15,
    locationRestriction: {
      circle: {
        center: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        radius: 1500.0,
      },
    },
  };

  try {
    console.log("Making API request to Google Places");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "*",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("API response received:", result);

    if (response.ok) {
      quizState.allPlaces = result.places || []; //returned coffee shops are stored in an array in quizstate object
      console.log("Sending places to backend");
      await sendCoffeeShopsToBackend(quizState.allPlaces);
      console.log("Places sent to backend successfully");
      return true;
    } else {
      console.error("Failed to fetch places:", result.error);
      return false;
    }
  } catch (err) {
    console.error("Error in fetchNearbyPlaces:", err);
    return false;
  }
}

const sendCoffeeShopsToBackend = async (places) => {
  console.log("Starting sendCoffeeShopsToBackend");
  if (places.length === 0) return;

  const structuredPlaces = places.map((place) => ({
    id: place.id,
    name: place.displayName.text || "Unnamed Coffee Shop",
    location: {
      latitude: place.location ? place.location.latitude : null,
      longitude: place.location ? place.location.longitude : null,
    },
    rating: place.rating || 0.0,
    userRatingCount: place.userRatingCount || 0,
    priceLevel: PRICE_LEVEL_MAPPING[place.priceLevel] || 0,
    types: place.types || [],
    formattedAddress: place.formattedAddress || "Address not available",
    businessStatus: place.businessStatus || "UNKNOWN",
    currentOpeningHours: place.currentOpeningHours || {},
    servesCoffee: place.servesCoffee || false,
    servesDessert: place.servesDessert || false,
    servesBreakfast: place.servesBreakfast || false,
    liveMusic: place.liveMusic || false,
    takeout: place.takeout || false,
    delivery: place.delivery || false,
    dineIn: place.dineIn || false,
    paymentOptions: place.paymentOptions || {},
    parkingOptions: place.parkingOptions || {},
    accessibilityOptions: place.accessibilityOptions || {},
  }));

  try {
    console.log("Sending request to backend");
    const response = await fetch(
      "http://127.0.0.1:8000/api/store-coffee-shops/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coffee_shops: structuredPlaces }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to store coffee shops.");
    }

    console.log("Coffee shops successfully stored in the database");
    return true;
  } catch (error) {
    console.error("Error storing coffee shops:", error);
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = "Failed to store coffee shops in the database.";
    return false;
  }
};

function getRecommendations(preferences) {
  let recommendedPlaces = [...quizState.allPlaces];

  if (preferences.pricePreference) {
    recommendedPlaces = recommendedPlaces.filter(
      (place) => place.priceLevel <= preferences.pricePreference
    );
  }

  if (preferences.foodImportance === "full") {
    recommendedPlaces = recommendedPlaces.filter(
      (place) => place.servesBreakfast
    );
  }

  recommendedPlaces = recommendedPlaces.map((place) => ({
    ...place,
    score: calculateMatchScore(place, preferences),
  }));

  recommendedPlaces.sort((a, b) => b.score - a.score);

  return recommendedPlaces.slice(0, 5);
}

/*function displayRecommendations(recommendations) {
  const container = document.getElementById("recommendations-container");
  const list = document.getElementById("recommendations-list");
  container.style.display = "block";
  list.innerHTML = "";

  recommendations.forEach((place) => {
    const card = document.createElement("div");
    card.className = "recommendation-card";

    const isOpen = place.currentOpeningHours?.openNow;
    const statusClass = isOpen ? "status-open" : "status-closed";
    const statusText = isOpen ? "Open" : "Closed";

    card.innerHTML = `
            <div class="shop-name">${place.displayName.text}</div>
            <div class="shop-rating">${getEmojiRating(place.rating)} (${
      place.rating
    })</div>
            <div class="shop-address">${place.formattedAddress}</div>
            <div class="shop-status ${statusClass}">${statusText}</div>
        `;

    list.appendChild(card);
  });
}*/

async function initializeQuiz() {
  const auth = getAuth();
  const loadingOverlay = document.getElementById("loading-overlay");

  try {
    console.log("Starting quiz initialization");

    // Check authentication first
    const user = await new Promise((resolve) => {
      console.log("Checking authentication");
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          console.log("No user found, redirecting to login");
          window.location.href = "login.html";
          return;
        }
        console.log("User authenticated:", user.uid);
        resolve(user);
      });
    });

    // Show loading overlay while getting location and fetching places
    loadingOverlay.classList.remove("hidden");
    console.log("Loading overlay displayed");

    // Get user location
    console.log("Getting user location");
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        geolocationOptions
      );
    });

    console.log("Location received:", position.coords);
    quizState.location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    quizState.userId = user.uid;

    // Fetch nearby places
    console.log("Fetching nearby places");
    const placesFound = await fetchNearbyPlaces(quizState.location);
    console.log("Places found:", placesFound);

    if (!placesFound) {
      throw new Error("Could not find nearby coffee shops");
    }

    // Show the quiz container and start the quiz
    console.log("Starting quiz display");
    document.getElementById("quiz-container").classList.remove("hidden");
    displayCurrentQuestion();
  } catch (error) {
    console.error("Error in quiz initialization:", error);
    document.getElementById("error-message").textContent =
      "Unable to access your location or find nearby coffee shops. Please enable location services and refresh the page.";
    document.getElementById("error-message").classList.remove("hidden");
  } finally {
    console.log("Hiding loading overlay");
    loadingOverlay.classList.add("hidden");
  }
}

function displayCurrentQuestion() {
  const questionContainer = document.getElementById("question-container");
  const progressBar = document.getElementById("progress-bar");

  if (quizState.complete) {
    showResults();
    return;
  }

  const question = quizQuestions[quizState.currentQuestion];

  progressBar.style.width = `${
    ((quizState.currentQuestion + 1) / quizQuestions.length) * 100
  }%`;
  progressBar.textContent = `${quizState.currentQuestion + 1}/${
    quizQuestions.length
  }`;

  questionContainer.innerHTML = `
        <h3 class="question-text">${question.text}</h3>
        <div class="options-container">
            ${question.options
              .map(
                (option, index) => `
                <button class="quiz-option" data-value="${option.value}">
                    ${option.label}
                </button>
            `
              )
              .join("")}
        </div>
    `;

  const options = questionContainer.querySelectorAll(".quiz-option");
  options.forEach((option) => {
    option.addEventListener("click", () => handleAnswer(option.dataset.value));
  });
}

function handleAnswer(value) {
  const question = quizQuestions[quizState.currentQuestion];
  quizState.answers[question.id] = value;

  if (quizState.currentQuestion < quizQuestions.length - 1) {
    quizState.currentQuestion++;
    displayCurrentQuestion();
  } else {
    quizState.complete = true;
    saveQuizResults();
  }
}

async function saveQuizResults() {
  const auth = getAuth();
  const db = getFirestore();

  try {
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }

    console.log("Quiz Answers:", quizState.answers);
    const quizContainer = document.getElementById("quiz-container");
    quizContainer.innerHTML = "<h2>Thanks for completing the quiz!</h2>";

    // Encode user answers
    const numericalVector = encodeAnswers(quizState.answers, quizQuestions);
    console.log("Encoded Vector:", numericalVector);

    // CSV file path
    const csvFilePath = "coffee_shops.csv";

    // Parse CSV file
    Papa.parse(csvFilePath, {
      download: true,
      header: true, // Treat first row as column names
      complete: function (results) {
        const coffeeShops = results.data; // Parsed coffee shop data
        console.log("Parsed Coffee Shops:", coffeeShops);

        // Continue with the next step: encode features
        const encodedShops = processCoffeeShops(coffeeShops);
        const array = findBestMatch(numericalVector, encodedShops, coffeeShops);
        displayMatches(array);
      },
    });

    await setDoc(doc(db, "userPreferences", auth.currentUser.uid), {
      preferences: quizState.answers,
      timestamp: new Date().toISOString(),
    });

    /*const recommendations = getRecommendations(quizState.answers);
    displayRecommendations(recommendations);
    displayAnswers();*/
  } catch (error) {
    console.error("Error saving quiz results:", error);
    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent =
      "There was an error saving your preferences. Please try again.";
    errorMessage.classList.remove("hidden");
  }
}

// Function to display top matches
function displayMatches(topMatch) {
  document.getElementById("output").innerHTML =
    "<h2>Recommended Coffee Shops</h2>";

  topMatch.forEach((match) => {
    document.getElementById(
      "output"
    ).innerHTML += `<p>${match.coffeeShop.name}</p>`;
  });

  /* console.log('Top Matches:', topMatch); // Debug log
  const recommendationsContainer = document.getElementById('recommendations-container');
  const recommendationsList = document.getElementById('recommendations-list');
  console.log('Recommendations Container:', recommendationsContainer); // Debug log
  console.log('Recommendations List:', recommendationsList); // Debug log

  // Clear existing content
  recommendationsList.innerHTML = '';

  // Show the container
  recommendationsContainer.classList.remove('hidden');

  if (topMatch.length === 0) {
    recommendationsContainer.innerHTML = '<p>No matches found. Please try again!</p>';
    return;
  }

  // Iterate through the top matches and generate HTML
  topMatch.forEach((match) => {
    console.log(match.coffeeShop.name);
    recommendationsContainer.innerHTML = '<h3>${match.coffeeShop.name}</h3>';
  });*/
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded, initializing quiz");
  initializeQuiz();
});

// Function to encode user answers
function encodeAnswers(answers, quizQuestions) {
  const encodedVector = [];

  for (const question of quizQuestions) {
    const userAnswer = answers[question.id];

    // Find the index of the user's answer
    const encodedValue =
      1 + question.options.findIndex((option) => option.value == userAnswer);

    if (encodedValue !== -1) {
      encodedVector.push(encodedValue);
    } else {
      console.error(`Answer for question "${question.id}" not found!`);
      encodedVector.push(-1); // Placeholder for missing answers
    }
  }

  return encodedVector;
}

function processCoffeeShops(coffeeShops) {
  const encodedShops = coffeeShops
    .map((shop) => {
      const atmosphereIndex = encodeAtmosphere(
        shop.takeout,
        shop.delivery,
        shop.dineIn
      );
      const foodIndex = encodeFoodImportance(
        shop.servesCoffee,
        shop.servesDessert,
        shop.servesBreakfast
      );
      if (atmosphereIndex === null || foodIndex === null) {
        return null; // Exclude shops with no valid atmosphere
      }
      return [
        encodeFeature(shop.priceLevel, ["1", "2", "3"]),
        atmosphereIndex, // Encoded atmosphere
        foodIndex, // Encoded foodImportance
        encodeTiming(shop.currentOpeningHours), // Logic for timing based on weekdayDescriptions
        encodeAccessibility(
          shop.paymentOptions,
          shop.accessibilityOptions,
          shop.parkingOptions
        ), // Logic for accessibility
      ];
    })
    .filter((shop) => shop !== null); // Remove excluded shops

  console.log("Encoded Coffee Shop Vectors:", encodedShops);

  return encodedShops;
}

function encodeFeature(value, options) {
  return options.indexOf(value) + 2;
}

function convertToBoolean(value) {
  if (typeof value === "string") {
    return value.toUpperCase() === "TRUE"; // Normalize the string to uppercase and compare
  }
  return false; // Return false if the value is not a string
}

function encodeAtmosphere(takeout, delivery, dineIn) {
  takeout = convertToBoolean(takeout);
  delivery = convertToBoolean(delivery);
  dineIn = convertToBoolean(dineIn);

  // Guard clause: If none are true, exclude the coffee shop
  if (!takeout && !delivery && !dineIn) {
    console.log("returning null");
    return null; // Return `null` or a specific marker to indicate exclusion
  }

  // Case 1: Only takeout is true
  if (takeout && !delivery && !dineIn) {
    return 1; // "quick"
  }
  // Case 2: Takeout and delivery are true, but dineIn is false
  else if (takeout && delivery && !dineIn) {
    return 2; // "casual"
  }
  // Case 3: All three are true
  else if (takeout && delivery && dineIn) {
    return 3; // "full"
  }
  // Case 4: Only delivery is true
  else if (!takeout && delivery && !dineIn) {
    return 2; // Default to "casual" for delivery only
  }
  // Case 5: Only dineIn is true
  else if (!takeout && !delivery && dineIn) {
    return 3; // Default to "full" for dineIn only
  }
  // Case 6: Takeout and dineIn are true, but delivery is false
  else if (takeout && !delivery && dineIn) {
    return 3; // Default to "full" (assume a full experience)
  }
  // Case 7: Delivery and dineIn are true, but takeout is false
  else if (!takeout && delivery && dineIn) {
    return 3; // Default to "full"
  }
  // Default case (should never occur if all combinations are listed)
  else {
    console.log("returning null 2 ");
    return null; // Exclude the coffee shop
  }
}

// Logic for encoding foodImportance based on boolean features
function encodeFoodImportance(servesCoffee, servesDessert, servesBreakfast) {
  servesCoffee = convertToBoolean(servesCoffee);
  servesBreakfast = convertToBoolean(servesBreakfast);
  servesDessert = convertToBoolean(servesDessert);

  //console.log(servesCoffee, servesDessert, servesBreakfast);

  // Case 1: Only serves coffee
  if (servesCoffee && !servesDessert && !servesBreakfast) {
    return 1; // "coffee" (basic offering)
  }
  // Case 2: Serves coffee and dessert, but not breakfast
  else if (servesCoffee && servesDessert && !servesBreakfast) {
    return 2; // "snacks" (coffee and dessert pair well for snacks)
  }
  // Case 3: Serves coffee, dessert, and breakfast
  else if (servesCoffee && servesDessert && servesBreakfast) {
    return 3; // "full" (comprehensive offering)
  }
  // Case 4: Serves coffee and breakfast, but not dessert
  else if (servesCoffee && !servesDessert && servesBreakfast) {
    return 3; // "full" (coffee and breakfast is substantial)
  }
  // Case 5: Only serves dessert
  else if (!servesCoffee && servesDessert && !servesBreakfast) {
    return 2; // "snacks" (dessert is similar to snack offerings)
  }
  // Case 6: Serves dessert and breakfast, but not coffee
  else if (!servesCoffee && servesDessert && servesBreakfast) {
    return 3; // "full" (dessert and breakfast combined is comprehensive)
  }
  // Case 7: Only serves breakfast
  else if (!servesCoffee && !servesDessert && servesBreakfast) {
    return 3; // "full" (breakfast alone is a substantial offering)
  }
  // Case 8: None of the above
  else if (!servesCoffee && !servesDessert && !servesBreakfast) {
    return null; // "invalid" (no offerings)
  }
}

// Logic for encoding timing based on "weekdayDescriptions"
function encodeTiming(currentOpeningHours) {
  try {
    // Step 1: Locate the `weekdayDescriptions` segment
    const startIndex = currentOpeningHours.indexOf("weekdayDescriptions");
    if (startIndex === -1) {
      console.log("weekdayDescriptions not found");
      return 0;
    }

    // Extract the substring starting from `weekdayDescriptions`
    const substring = currentOpeningHours.slice(startIndex);
    //console.log("Extracted substring starting with weekdayDescriptions:", substring);

    // Step 2: Extract the array content
    const arrayStartIndex = substring.indexOf("[");
    const arrayEndIndex = substring.indexOf("]");
    if (arrayStartIndex === -1 || arrayEndIndex === -1) {
      console.log("Array not properly formatted");
      return 0;
    }

    const arrayContent = substring.slice(arrayStartIndex + 1, arrayEndIndex);
    //console.log("Extracted array content:", arrayContent);

    // Step 3: Split the array into individual day entries
    const days = arrayContent
      .split("',")
      .map((day) => day.replace(/['"]/g, "").trim());
    //console.log("Split days array:", days);

    // Step 4: Find the entry for Monday
    const mondayEntry = days.find((day) => day.startsWith("Monday:"));
    //console.log("Monday entry:", mondayEntry);
    if (!mondayEntry) {
      console.log("Monday not found");
      return 0;
    }

    // Step 5: Extract the first number after the colon
    const timePart1 = mondayEntry.split(":"); // Get the part after the first colon
    if (!timePart1) {
      console.log("Invalid time part in Monday entry");
      return 0;
    }

    //console.log(timePart1);
    if (timePart1[1] === " Open 24 hours") {
      return 3;
    }

    const timePart2 = timePart1[2].split("\\u202f");
    const timePart3 = timePart2[1].split("\\u");

    //console.log("Timepart2:", timePart2);
    //console.log("Timepart3:", timePart3);
    const cleanedTime1 = timePart1[1];
    const cleanedTime2 = timePart2[0];
    const cleanedTime3 = timePart3[0];
    //console.log(cleanedTime1);
    //console.log(cleanedTime2);
    //console.log(cleanedTime3);

    const openingTime = cleanedTime1 + cleanedTime2 + cleanedTime3;

    //console.log("Extracted opening time:", openingTime);

    if (!openingTime) {
      console.log("Invalid opening time");
      return 0;
    }

    // Step 6: Parse opening time to determine opening period
    //const openingHour = parseInt(openingTime.split(":")[0], 10);
    const isPM = cleanedTime3.includes("PM");
    const normalizedHour =
      isPM && cleanedTime1 !== 12 ? cleanedTime1 + 12 : cleanedTime1;

    console.log("Normalized opening hour (24-hour):", normalizedHour);

    // Step 7: Apply logic to determine index based on opening period
    if (normalizedHour <= 9) {
      console.log("Returning 1 (morning)");
      return 1;
    }
    if (normalizedHour >= 10 && normalizedHour < 17) {
      console.log("Returning 2 (daytime)");
      return 2;
    }
    if (normalizedHour >= 17) {
      console.log("Returning 3 (evening)");
      return 3;
    }

    console.log("Default return 0");
    return 0;
  } catch (error) {
    console.error("Error in encodeTiming:", error);
    return 0;
  }
}

// Logic for encoding accessibility
function encodeAccessibility(
  paymentOptions,
  accessibilityOptions,
  parkingOptions
) {
  const arr = [parkingOptions, paymentOptions, accessibilityOptions];
  const result = getStringWithHighestTrue(arr);
  console.log(result);
  if (result.includes("accepts")) {
    return 3;
  } else if (
    result.includes("free") ||
    result.includes("valet") ||
    result.includes("paid")
  ) {
    return 1;
  } else if (result.includes("wheelchair")) {
    return 2;
  } else {
    return Math.floor(Math.random() * 3) + 1;
  }
}

function getStringWithHighestTrue(strings) {
  //console.log(typeof strings);
  let maxCount = 0;
  let stringWithMaxTrue = " ";

  for (const str of strings) {
    const count = countTrueOccurrences(str);
    if (count > maxCount) {
      maxCount = count;
      stringWithMaxTrue = str;
    }
  }

  return stringWithMaxTrue;
}

function countTrueOccurrences(inputString) {
  const matches = inputString.match(/True/g); // Match all "True"
  return matches ? matches.length : 0; // Return count or 0 if none
}

function cosineSimilarity(vec1, vec2) {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val ** 2, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val ** 2, 0));
  return dotProduct / (magnitude1 * magnitude2);
}

function findBestMatch(userVector, shopVectors, coffeeShops, topN = 5) {
  // Array to store similarity scores and their corresponding coffee shops
  const matches = [];

  shopVectors.forEach((shopVector, index) => {
    console.log(coffeeShops[index].name, shopVector, coffeeShops[index].id);

    // Calculate similarity
    const similarity = cosineSimilarity(userVector, shopVector);
    console.log(`Similarity with ${coffeeShops[index].name}:`, similarity);

    // Add the shop and its similarity score to the matches array
    matches.push({
      coffeeShop: coffeeShops[index],
      similarity,
    });
  });

  // Sort the matches by similarity score in descending order
  matches.sort((a, b) => b.similarity - a.similarity);

  // Select the top N matches
  const topMatches = matches.slice(0, topN);

  console.log("Top Matches:", topMatches);
  return topMatches;
}
