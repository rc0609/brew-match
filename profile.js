import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Your web app's Firebase configuration (ensure this matches your firebase-config.js)
const firebaseConfig = {
  apiKey: "AIzaSyBQIoG1AKHFRkJv7VZ6Z39ob-Fm8lYYo5w",
  authDomain: "brew-match.firebaseapp.com",
  projectId: "brew-match",
  storageBucket: "brew-match.appspot.com",
  messagingSenderId: "871621577528",
  appId: "1:871621577528:web:d8af0d672974024d954fcd",
  measurementId: "G-Y6YQ6NBFMX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth();
const db = getFirestore();

/**
 * Displays a message to the user.
 * @param {string} message - The message to display.
 * @param {string} divId - The ID of the div where the message will be displayed.
 */
function displayMessage(message, divId) {
  const msg = document.getElementById(divId);
  if (msg) {
    msg.classList.remove("hidden");
    msg.innerHTML = message;
    msg.style.opacity = 1;
  }
}

/**
 * Fetches and displays user data from Firestore.
 * @param {object} user - The authenticated user object.
 */
async function fetchAndDisplayUserData(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      document.getElementById("username").textContent =
        `${userData.firstName || "Anonymous"} ${
          userData.lastName || ""
        }`.trim() || "Anonymous";
      document.getElementById("email").textContent = user.email || "Guest User";
      // Populate other fields as necessary
    } else {
      console.log("No such document!");
      document.getElementById("username").textContent = "Anonymous";
      document.getElementById("email").textContent = user.email || "Guest User";
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    displayMessage("Error loading profile information.", "profile-message");
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    // Optionally, display a message before redirecting
    displayMessage("Logged out successfully!", "profile-message");
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Error during logout:", error);
    displayMessage("Error logging out. Please try again.", "profile-message");
  }
}

function attachEventListeners() {
  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    fetchAndDisplayUserData(user);
  } else {
    // No user is signed in, redirect to login page
    window.location.href = "index.html";
  }
});

// Initialize event listeners when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", attachEventListeners);
