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

const firebaseConfig = {
  apiKey: "AIzaSyBQIoG1AKHFRkJv7VZ6Z39ob-Fm8lYYo5w",
  authDomain: "brew-match.firebaseapp.com",
  projectId: "brew-match",
  storageBucket: "brew-match.appspot.com",
  messagingSenderId: "871621577528",
  appId: "1:871621577528:web:d8af0d672974024d954fcd",
  measurementId: "G-Y6YQ6NBFMX",
  databaseURL: "https://brew-match-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();

const apiKey = "AIzaSyDxYbXeIc-rgRwoRY_QnJJ17O8JdVgUO5E";

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
    quizContainer.innerHTML = '<h2>Thanks for completing the quiz!</h2>';
   
    // Encode user answers
    const numericalVector = encodeAnswers(quizState.answers, quizQuestions);
    console.log("Encoded Vector:", numericalVector);
    

    await setDoc(doc(db, "userPreferences", auth.currentUser.uid), {
      preferences: quizState.answers,
      timestamp: new Date().toISOString(),
    });


    /*const recommendations = getRecommendations(quizState.answers);
    displayRecommendations(recommendations);*/
  } catch (error) {
    console.error("Error saving quiz results:", error);
    const errorMessage = document.getElementById("error-message");
    errorMessage.textContent =
      "There was an error saving your preferences. Please try again.";
    errorMessage.classList.remove("hidden");
  }
}

function showResults() {
  const quizContainer = document.getElementById("quiz-container");
  quizContainer.innerHTML = `
        <div class="results-container">
            <h2>Thanks for completing the quiz!</h2>
            <p>Your preferences have been saved. Redirecting you to the map...</p>
            <div class="loading-spinner"></div>
        </div>
    `;
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
    const encodedValue = question.options.findIndex(
      (option) => option.value == userAnswer
    );

    if (encodedValue !== -1) {
      encodedVector.push(encodedValue);
    } else {
      console.error(`Answer for question "${question.id}" not found!`);
      encodedVector.push(-1); // Placeholder for missing answers
    }
  }

  return encodedVector;
}
